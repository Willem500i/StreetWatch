from roboflow import Roboflow
import cv2
import numpy as np
from PIL import Image
from json import loads
import keras_ocr

# https://blog.roboflow.com/license-plate-detection-and-ocr/



pipeline = keras_ocr.pipeline.Pipeline()
# parking = Roboflow(api_key="put key here")
parking_project = parking.workspace().project("illegal-parking")
parking_model = parking_project.version(4).model

# infer on a local image
print(parking_model.predict("photos/car8.png", confidence=20, overlap=30).json())

# license = Roboflow(api_key="put key here")
license_project = license.workspace().project("license-plate-recognition-rxg4e")
license_model = license_project.version(4).model

# infer on a local image
plate_obj = license_model.predict("photos/car8.png", confidence=20, overlap=30).json()

def preprocessImage(image):
    # Read Image
    img = cv2.imread(image)
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


print(plate_obj["predictions"])

frame = cv2.imread("photos/car8.png")
x, y, width, height = plate_obj["predictions"][0]["x"], plate_obj["predictions"][0]["y"], plate_obj["predictions"][0]["width"], plate_obj["predictions"][0]["height"]
crop_frame = frame[int(y-height / 2):int(y + height / 2), int(x - width / 2):int(x + width / 2)]
cv2.imwrite("photos/plate.jpg", crop_frame)
preprocessImage("photos/plate.jpg")

images = [keras_ocr.tools.read("photos/plate.jpg")]
prediction_groups = pipeline.recognize(images)
for predictions in prediction_groups:
    for prediction in predictions:
        print(prediction[0])