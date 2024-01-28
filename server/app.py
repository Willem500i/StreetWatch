from roboflow import Roboflow
import cv2
import numpy as np
from PIL import Image
from json import loads
import keras_ocr
import flask
import sqlite3
from os import getcwd
import datetime
import uuid
import base64
import io

PARKING_CONFIDENCE_THRESHOLD = 15
PLATE_CONFIDENCE_THRESHOLD = 15
PARKING_OVERLAP = 30
PLATE_OVERLAP = 30

ROBOFLOW_API_KEY = "PwlSn08nyNsZDHD0aSlg"

DATABASE = getcwd() + "/data/database.db"


# (1) https://blog.roboflow.com/license-plate-detection-and-ocr/
# (2) https://universe.roboflow.com/roboflow-universe-projects/license-plate-recognition-rxg4e/model/4


pipeline = keras_ocr.pipeline.Pipeline()
parking = Roboflow(api_key=ROBOFLOW_API_KEY)
parking_project = parking.workspace().project("illegal-parking")
parking_model = parking_project.version(4).model

license = Roboflow(api_key=ROBOFLOW_API_KEY)
license_project = license.workspace().project("license-plate-recognition-rxg4e")
license_model = license_project.version(4).model


app = flask.Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"]=True

# Index page. Only used to clear and remake the database for debugging/presentation purposes.
@app.route("/")
def index():
    db = get_db()
    cur = db.cursor()
    cur.execute("DROP TABLE entry")
    cur.execute("CREATE TABLE entry(date,lat,lon,device_id,notes,path,confidence_park,confidence_plate,plate)")
    cur.close()
    db.commit()
    return "index"

# View the details of a report.
@app.route("/report")
def view_report():
  id = flask.request.args.get("id")
  if not id:
    return flask.Response("Invalid or missing report ID", status="404")
  db = get_db()
  cur = db.cursor()
  cur.execute("SELECT * from entry WHERE path = (?)",(id,))
  row = cur.fetchone()
  lat, lon, date, device_id, notes, pac, plc, plate = [None for _ in range(8)]
  if row:
    date, lat, lon, device_id, notes, pac, plc, plate = row[0],row[1],row[2],row[3],row[4],row[6],row[7],row[8]
  return flask.render_template("viewreport.html", pagetitle="View Report", lat=lat,lon=lon,date=date,device_id=device_id,notes=notes,id=id, park=pac, platec=plc, plate=plate)

# Clear all entries from db, but keep db.
@app.route("/clear")
def clear_entries():
  db = get_db()
  cur = db.cursor()
  cur.execute("DELETE FROM entry")
  cur.close()
  db.commit()
  return "Cleared"

# Create a new submission
@app.route("/api/form", methods=["GET", "POST"])
def post_image():

  # Deprecated method
  if flask.request.method == "GET":
    return flask.render_template("manual.html")
  
  # Random file name
  new_file_name = str(uuid.uuid4())
  img_file_str = io.BytesIO(base64.b64decode(flask.request.form['image'])).read()
  img_file_bytes = np.fromstring(img_file_str, np.uint8)
  img_file_cv = cv2.imdecode(img_file_bytes, cv2.IMREAD_UNCHANGED)

  cv2.imwrite(fr"./static/images/{new_file_name}.jpg", img_file_cv)
  # Make predictions
  park_obj = parking_model.predict(fr"./static/images/{new_file_name}.jpg", confidence=PARKING_CONFIDENCE_THRESHOLD, overlap=PARKING_OVERLAP).json()
  plate_obj = license_model.predict(fr"./static/images/{new_file_name}.jpg",confidence=PLATE_CONFIDENCE_THRESHOLD,overlap=PLATE_OVERLAP).json()

  # If no predictions, disregard
  if len(park_obj["predictions"]) == 0 or len(park_obj["predictions"]) == 0:
    return flask.Response("Could not identify parking job or license plate.", status=406)
  # Get confidence levels
  park_confidence = float(park_obj["predictions"][0]["confidence"]) * 100
  plate_confidence = float(plate_obj["predictions"][0]["confidence"]) * 100

  # If plate and park are probably not present, disregard
  if park_confidence < PARKING_CONFIDENCE_THRESHOLD and plate_confidence < PLATE_CONFIDENCE_THRESHOLD:
      return flask.Response("Could not identify parking job or license plate.", status=406)
  
  frame = cv2.imread(fr"./static/images/{new_file_name}.jpg")

  # Crop image to be around detected plate area
  x, y, width, height = plate_obj["predictions"][0]["x"], plate_obj["predictions"][0]["y"], plate_obj["predictions"][0]["width"], plate_obj["predictions"][0]["height"]
  crop_frame = frame[int(y-height / 2):int(y + height / 2), int(x - width / 2):int(x + width / 2)]
  preprocessImage(crop_frame)

  # Find plate text
  images = [keras_ocr.tools.read(crop_frame)]
  prediction_groups = pipeline.recognize(images)
  for predictions in prediction_groups:
    for prediction in predictions:
      print(prediction[0])

  # Store submission info in db
  db = get_db()
  cur = db.cursor()
  date = datetime.datetime.now()
  lon = flask.request.form["lon"]
  lat = flask.request.form["lat"]
  device_id = flask.request.form["deviceId"]
  notes = flask.request.form["notes"]
  plate = prediction[0]
  entry_data = (date,lat,lon,device_id,notes,new_file_name, park_confidence, plate_confidence, plate)
  print(new_file_name)
  cur.execute("INSERT INTO entry VALUES(?,?,?,?,?,?,?,?,?)", entry_data)
  cur.close()
  db.commit()

  return flask.Response("Submission processed", status=200)

# From Roboflow, some basic image preprocessing
def preprocessImage(image):
  # Read Image (already read)
  #img = cv2.imread(image)
  # Resize Image
  img = cv2.resize(image, None, fx=1.2, fy=1.2, interpolation=cv2.INTER_CUBIC)
  # Change Color Format
  img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
  # Kernel to filter image
  kernel = np.ones((1, 1), np.uint8)
  # Dilate + Erode image using kernel
  img = cv2.dilate(img, kernel, iterations=1)
  img = cv2.erode(img, kernel, iterations=1)
  img = cv2.addWeighted(img, 4, cv2.blur(img, (30, 30)), -4, 128)
  # ret image
  img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
  return img

# Database method
def get_db():
  db = getattr(flask.g, '_database', None)
  if db is None:
    db = flask.g._database = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
  return db
