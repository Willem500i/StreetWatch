from roboflow import Roboflow
import cv2
import numpy as np
from PIL import Image
from json import loads
import keras_ocr
import flask
import sqlite3


PARKING_CONFIDENCE_THRESHOLD = 20
PLATE_CONFIDENCE_THRESHOLD = 20
PARKING_OVERLAP = 30
PLATE_OVERLAP = 30
TAKE_AGAIN = 406


ROBOFLOW_API_KEY = "PwlSn08nyNsZDHD0aSlg"

DATABASE = "/data/database.db"


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
@app.route("/")
def index():
    return "Hello world"

@app.route("/api/form")
def post_image():
  img_file = flask.request.files.get('image', '')

  park_obj = parking_model.predict(img_file, confidence=PARKING_CONFIDENCE_THRESHOLD, overlap=PARKING_OVERLAP).json()
  plate_obj = license_model.predict(img_file,confidence=PLATE_CONFIDENCE_THRESHOLD,overlap=PLATE_OVERLAP).json()

  park_confidence = float(park_obj["predictions"][0]["confidence"]) * 100
  plate_confidence = float(plate_obj["predictions"][0]["confidence"]) * 100

  if park_confidence < PARKING_CONFIDENCE_THRESHOLD and plate_confidence < PLATE_CONFIDENCE_THRESHOLD:
      return TAKE_AGAIN

  frame = cv2.imread(img_file)

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


  cur = get_db().cursor()



  with open("reports/current.txt", "w") as f:
    f.write("DATE: 1/27/2024\n")
    f.write("Incident: Illegally Parked\n")
    f.write("Location: some place, DC\n")
    f.write("GEO: <lat, long>\n")
    f.write("PLATE: "+ str(prediction_groups[0][0][0]))
    f.write("\nContact us beep boop")

# From Roboflow (Source 1)
def preprocessImage(image):
  # Read Image (already read)
  #img = cv2.imread(image)
  # Resize Image
  img = cv2.resize(img, None, fx=1.2, fy=1.2, interpolation=cv2.INTER_CUBIC)
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