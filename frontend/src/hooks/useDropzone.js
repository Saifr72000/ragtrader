import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

const useImageUpload = () => {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    multiple: false,
    noClick: true,
    noKeyboard: true,
  });

  return {
    imageFile,
    setImageFile,
    imagePreview,
    setImagePreview,
    getRootProps,
    getInputProps,
    isDragActive,
    open,
  };
};

export default useImageUpload;
