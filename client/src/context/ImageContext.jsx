import { createContext, useContext, useState } from "react";

const ImageContext = createContext();

export function ImageProvider({ children }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [environment, setEnvironment] = useState({
    location: "",
    temperature: "",
    humidity: "",
    uvIndex: "",
    airQuality: "",
  });

  const [prediction, setPrediction] = useState(null);

  return (
    <ImageContext.Provider
      value={{
        selectedImage,
        setSelectedImage,
        selectedFile,
        setSelectedFile,
        environment,
        setEnvironment,
        prediction,
        setPrediction,
      }}
    >
      {children}
    </ImageContext.Provider>
  );
}

export function useImageContext() {
  return useContext(ImageContext);
}