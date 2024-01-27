import React, { useRef, useState, useEffect } from "react";
import {
  Button,
  PermissionsAndroid,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { Camera } from "expo-camera";
import * as MediaLibrary from "expo-media-library";

const App = () => {
  const [photo, setPhoto] = useState(null);
  const [cameraPerms, setCameraPerms] = useState(false);
  const [libraryPerms, setLibraryPerms] = useState(false);

  useEffect(() => {
    const requestPerms = async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const mediaLibraryPermission =
        await MediaLibrary.requestPermissionsAsync();
      setCameraPerms(cameraPermission.status === "granted");
      setLibraryPerms(mediaLibraryPermission.status === "granted");
    };

    requestPerms();
  }, []);

  let cameraRef = useRef();

  const takePic = async () => {
    let options = {
      quality: 1,
      base64: true,
      exif: false,
    };
    let newPhoto = await cameraRef.current.takePictureAsync(options);
    setPhoto(newPhoto);
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
        <Button title="Save" onPress={savePhoto} />
        <Button title="Discard" onPress={() => setPhoto(null)} />
      </SafeAreaView>
    );
  }

  return (
    <Camera style={styles.container} ref={cameraRef}>
      <View style={styles.buttonContainer}>
        <Button title="Take Pic" onPress={takePic} />
      </View>
      <StatusBar style="auto" />
    </Camera>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingTop: StatusBar.currentHeight,
    backgroundColor: "#ecf0f1",
    padding: 8,
  },
  buttonContainer: {
    backgroundColor: "fff",
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

export default App;
