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


PARKING_CONFIDENCE_THRESHOLD = 20
PLATE_CONFIDENCE_THRESHOLD = 20
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
app.debug = True
@app.route("/")
def index():
    
    db = get_db()
    cur = db.cursor()
    cur.execute("DROP TABLE entry")
    cur.execute("CREATE TABLE entry(date,lat,lon,device_id,notes,path)")
    cur.close()
    db.commit()
    return "index"

@app.route("/all")
def view_all():
  cur = get_db().cursor()

  rows = cur.execute("SELECT * FROM entry")
  for row in rows:
    print(row)

  print("TESTESTEST")
  return "Hi"

@app.route("/report")
def view_report():
  id = flask.request.args.get("id")
  if not id:
    return flask.Response("Invalid or missing report ID", status="404")
  db = get_db()
  cur = db.cursor()
  cur.execute("SELECT * from entry WHERE photo = (?)",(id,))
  row = cur.fetchone()
  lat, lon, date, device_id, device_os, device_type = [None for _ in range(6)]
  if row:
    print(len(row))
    print(row)
    date, lat, lon, device_id, device_type, device_os = [x for x in row[:6]]

  return flask.render_template("viewreport.html", pagetitle="View Report", lat=lat,lon=lon,date=date,device_id=device_id,device_os=device_os,device_type=device_type,id=id)

@app.route("/clear")
def clear_entries():
  db = get_db()
  cur = db.cursor()
  cur.execute("DELETE FROM entry")
  cur.close()
  db.commit()
  return "Cleared"

@app.route("/api/form", methods=["GET", "POST"])
def post_image():

  if flask.request.method == "GET":
    return flask.render_template("manual.html")
  
  new_file_name = str(uuid.uuid4())
  print("here1")
  img_file = flask.request.files['image']
  print("here6")
  img_file_str = img_file.read()
  print("here5")
  img_file_bytes = np.fromstring(img_file_str, np.uint8)
  img_file_cv = cv2.imdecode(img_file_bytes, cv2.IMREAD_UNCHANGED)
  if not img_file:
    print("IMAGE NOT FOUND")
    exit()
  print("here4")
  cv2.imwrite(fr"./static/images/{new_file_name}.jpg", img_file_cv)
  park_obj = parking_model.predict(fr"./static/images/{new_file_name}.jpg", confidence=PARKING_CONFIDENCE_THRESHOLD, overlap=PARKING_OVERLAP).json()
  plate_obj = license_model.predict(fr"./static/images/{new_file_name}.jpg",confidence=PLATE_CONFIDENCE_THRESHOLD,overlap=PLATE_OVERLAP).json()

  park_confidence = float(park_obj["predictions"][0]["confidence"]) * 100
  plate_confidence = float(plate_obj["predictions"][0]["confidence"]) * 100

  if park_confidence < PARKING_CONFIDENCE_THRESHOLD and plate_confidence < PLATE_CONFIDENCE_THRESHOLD:
      return flask.Response("Could not identify parking job or license plate.", status=406)
  print("here2")

  frame = cv2.imread(fr"./static/images/{new_file_name}.jpg")

  x, y, width, height = plate_obj["predictions"][0]["x"], plate_obj["predictions"][0]["y"], plate_obj["predictions"][0]["width"], plate_obj["predictions"][0]["height"]
  crop_frame = frame[int(y-height / 2):int(y + height / 2), int(x - width / 2):int(x + width / 2)]
  #cv2.imwrite("photos/plate.jpg", crop_frame)
  preprocessImage(crop_frame)

  #images = [keras_ocr.tools.read("photos/plate.jpg")]
  images = [keras_ocr.tools.read(crop_frame)]
  prediction_groups = pipeline.recognize(images)
  for predictions in prediction_groups:
    for prediction in predictions:
      print(prediction[0])

  db = get_db()
  cur = db.cursor()

  data = flask.request.get_json()

  print("here3")

  date = datetime.datetime.now()
  lat = data["location"]["GeoLatitude"]
  lon = data["location"]["GeoLongitude"]
  device_id = data["deviceId"]
  notes = data["notes"]


  entry_data = (date,lat,lon,device_id,notes,new_file_name)

  cur.execute("INSERT INTO entry VALUES(?,?,?,?,?,?)", entry_data)
  cur.close()
  db.commit()

  return flask.Response("Submission processed", status=200)

# From Roboflow (Source 1)
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

# Database methods

def get_db():
  db = getattr(flask.g, '_database', None)
  if db is None:
    db = flask.g._database = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
  return db

@app.teardown_appcontext
def close_connection(exception):
  db = getattr(flask.g, '_database', None)
  if db is not None:
    db.close()

def query_db(query, args=(), one=False):
  cur = get_db().execute(query, args)
  rv = cur.fetchall()
  cur.close()
  return (rv[0] if rv else None) if one else rv