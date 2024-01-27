import React, { useRef, useState, useEffect } from "react";
import {
  Button,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { Camera } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Audio } from "expo-av";
import * as Location from "expo-location";

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
  const [video, setVideo] = useState(null);
  const [location, setLocation] = useState(null);

  const [isRecording, setIsRecording] = useState(false);

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
    setPhoto(newPhoto);
  };

  const handleVideoRecording = async () => {
    if (cameraRef.current) {
      if (isRecording) {
        cameraRef.current.stopRecording();
        setIsRecording(false);
      } else {
        setIsRecording(true);
        const video = await cameraRef.current.recordAsync();
        setVideo(video);
      }
    }
  };

  const savePhoto = () => {
    MediaLibrary.saveToLibraryAsync(photo.uri).then(() => {
      setPhoto(null);
    });
  };

  const saveVideo = () => {
    MediaLibrary.saveToLibraryAsync(video.uri).then(() => {
      setVideo(null);
    });
  };

  if (photo) {
    return (
      <SafeAreaView style={styles.container}>
        <Image
          style={styles.preview}
          source={{ uri: "data:image/jpg;base64," + photo.base64 }}
        />
        <Button title="Save" onPress={savePhoto} />
        <Button title="Discard" onPress={() => setPhoto(null)} />
      </SafeAreaView>
    );
  }
  if (video) {
    return (
      <SafeAreaView style={styles.container}>
        <Button title="Save" onPress={saveVideo} />
        <Button title="Discard" onPress={() => setVideo(null)} />
      </SafeAreaView>
    );
  }

  return (
    <Camera style={styles.container} ref={cameraRef}>
      <View style={styles.buttonContainer}>
        {!isRecording && <Button title="Take Pic" onPress={takePic} />}
        <Button
          title={isRecording ? "Stop Recording" : "Start Recording"}
          onPress={handleVideoRecording}
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
