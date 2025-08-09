import fetch from "node-fetch";
import FormData from "form-data";
import axios from "axios";

export const pythonUploadImage = async (imageBuffer, filename, folder) => {
  const formData = new FormData();
  formData.append("file", imageBuffer, {
    filename: filename,
    contentType: "image/png", // You might want to detect this dynamically
  });
  formData.append("folder", folder);

  const response = await axios.post(
    "http://localhost:8000/upload-image",
    formData,
    {
      headers: {
        ...formData.getHeaders(),
      },
    }
  );
  return response.data.url;
};
