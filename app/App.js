import React, { useRef, useState, useEffect } from "react";
import {
  Button,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Image,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Camera } from "expo-camera";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as Location from "expo-location";
import * as Device from "expo-device";
const API_ENDPOINT = "127.0.0.1:5000";

const Tab = createBottomTabNavigator();

function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.item}>StreetWatch</Text>
      <Text style={styles.paragraph}>
        Welcome to StreetWatch, helping keep traffic clear and the streets safe.
        In order to use the app properly, please allow location and camera
        permissions when prompted.
      </Text>
      <Text style={styles.paragraph}>
        Tap on "Submit Report" in the corner to submit a traffic violation.
      </Text>
    </SafeAreaView>
  );
}

function CameraScreen() {
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [photoSent, setPhotoSent] = useState(false);

  const [retakePhoto, setRetakePhoto] = useState(false);
  const [pictureBeingTaken, setPictureBeingTaken] = useState(false);
  const [loading, setLoading] = useState(false);

  const [userComments, setUserComments] = useState("");

  useEffect(() => {
    const requestPerms = async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();

      const locationStatus = await Location.requestForegroundPermissionsAsync();

      if (locationStatus.status === "granted") {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      }
    };

    requestPerms();
  }, []);

  let cameraRef = useRef();

  const takePic = async () => {
    let options = {
      quality: 1,
      base64: true,
      exif: true,
      fixOrientation: true,
      forceUpOrientation: true,
      writeExif: (extraExif = {
        GPSLatitude: location.coords.latitude,
        GPSLongitude: location.coords.longitude,
        GPSAltitude: location.coords.altitude,
      }),
    };
    let newPhoto = await cameraRef.current.takePictureAsync(options);
    setPictureBeingTaken(false);
    setPhoto(newPhoto);
  };

  const uploadPhoto = async () => {
    const formData = new FormData();
    formData.append(
      "image",
      {
        uri: photo.uri,
        type: "image/jpeg",
        name: "image.jpg",
      },
      "location",
      {
        GPSLatitude: location.coords.latitude,
        GPSLongitude: location.coords.longitude,
        GPSAltitude: location.coords.altitude,
      },
      "device",
      { Device },
      "notes",
      { userComments },
    );
    setLoading(true);
    await fetch(`${API_ENDPOINT}/api/form`, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
      .then((response) => {
        if (response.status === 406) {
          // retake photo
          setRetakePhoto(true);
        } else {
          setPhotoSent(true);
          setPhoto(null);
        }
        console.log("Success:", response);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
    setLoading(false);
  };

  if (photo) {
    return (
      <SafeAreaView style={styles.container}>
        <Image
          style={styles.preview}
          source={{ uri: "data:image/jpg;base64," + photo.base64 }}
        />
        {loading ? (
          <ActivityIndicator />
        ) : (
          <View>
            <Text style="bold">
              Submit image with the following information?
            </Text>
            <Text>
              Location: {location.coords.latitude}, {location.coords.longitude}
            </Text>
            <Text>
              Device: {Device.modelName}({Device.deviceName})
            </Text>
            <TextInput
              style={styles.input}
              placeholder="additional comments"
              value={userComments}
              onChangeText={setUserComments}
            />
            <Button title="Upload Photo" onPress={uploadPhoto} />
            <Button title="Discard" onPress={() => setPhoto(null)} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  return retakePhoto ? (
    <View>
      The photo could not be read. Please retake the photo now. <br></br>
      <Button
        title="Retake Photo"
        onPress={() => {
          setPhoto(null);
          setRetakePhoto(false);
          setPhotoSent(false);
        }}
      />
    </View>
  ) : photoSent ? (
    <View>
      <Text>
        Photo has been successfully uploaded.<br></br>
        <Button
          title="Take Another"
          onPress={() => {
            setPhotoSent(false);
          }}
        />
      </Text>
    </View>
  ) : (
    <Camera style={styles.container} ref={cameraRef}>
      <View style={styles.buttonContainer}>
        <Button
          title={pictureBeingTaken ? "capturing photo..." : "Take Picture"}
          onPress={() => {
            setPictureBeingTaken(true);
            takePic();
          }}
        />
      </View>
      <StatusBar style="auto" />
    </Camera>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarActiveTintColor: "tomato",
          tabBarInactiveTintColor: "gray",
          tabBarStyle: [
            {
              display: "flex",
            },
            null,
          ],
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === "Home") {
              iconName = focused ? "ios-home" : "ios-home-outline";
            } else if (route.name === "Submit Report") {
              iconName = focused ? "ios-camera" : "ios-camera-outline";
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Submit Report" component={CameraScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingTop: StatusBar.currentHeight,
    backgroundColor: "#ecf0f1",
    padding: 8,
  },
  buttonContainer: {
    backgroundColor: "white",
    alignSelf: "flex-end",
    margin: 4,
  },
  item: {
    margin: 24,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  paragraph: {
    margin: 24,
    fontSize: 16,
    fontWeight: "normal",
    textAlign: "center",
  },
  preview: {
    alignSelf: "stretch",
    flex: 1,
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
});
