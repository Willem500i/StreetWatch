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
} from "react-native";
import { Camera } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Audio } from "expo-av";
import * as Location from "expo-location";
import DeviceInfo from "react-native-device-info";

const Tab = createBottomTabNavigator();

function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.item}>Home Screen</Text>
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

  const [uniqueId, setUniqueId] = useState(null);
  const [deviceType, setDeviceType] = useState(null);
  const [deviceOS, setDeviceOS] = useState(null);

  useEffect(() => {
    const requestPerms = async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const mediaLibraryPermission =
        await MediaLibrary.requestPermissionsAsync();
      const AudioPerm = await Audio.requestPermissionsAsync();
      const locationStatus = await Location.requestForegroundPermissionsAsync();

      if (locationStatus.status === "granted") {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      }
      const uniqueId = await DeviceInfo.getUniqueId();
      const type = await DeviceInfo.getType();
      const os = await DeviceInfo.getOs();

      setUniqueId(uniqueId);
      setDeviceType(type);
      setDeviceOS(os);
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
      { uniqueId, deviceType, deviceOS },
    );
    setLoading(true);
    await fetch("https://api.example.com/upload", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
      .then((data) => {
        if (data.response === "Retake Photo") {
          setRetakePhoto(true);
        } else {
          setPhotoSent(true);
          setPhoto(null);
        }
        console.log("Success:", data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
    setLoading(false);
  };

  const savePhoto = () => {
    MediaLibrary.saveToLibraryAsync(photo.uri).then(() => {
      setPhoto(null);
    });
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
            <Button title="Upload Photo" onPress={uploadPhoto} />
            <Button title="Save" onPress={savePhoto} />
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
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === "Home") {
              iconName = focused ? "ios-home" : "ios-home-outline";
            } else if (route.name === "Camera") {
              iconName = focused ? "ios-camera" : "ios-camera-outline";
            }

            // You can return any component that you like here
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
        tabBarOptions={{
          activeTintColor: "tomato",
          inactiveTintColor: "gray",
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Camera" component={CameraScreen} />
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
  },
  item: {
    margin: 24,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  preview: {
    alignSelf: "stretch",
    flex: 1,
  },
});
