import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";

const GOOGLE_CREDENTIALS_JSON = {
  type: "service_account",
  project_id: "ragtrader",
  private_key_id: "8da1fe1a325260dabf7e20144d0e25565d4879d5",
  private_key:
    "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD4Qg+YaFgKpc5k\\n6eYDmSXzucwvmxbNIbFiRVtjCLPYoBrOnAzm9fTELCLg3HP/qUj8AryipHK67uKt\\niVXhpz9HJXDOcRKSHr46EyZKX10vfZwl8y5Fn28Q9DOWKFXodfhslxDWwa5RsroH\\npYEv2LQujJddZ8uR7i5PSh4sryT44gYbBmLELtJoqULlV8R9DRI2CnDUyrwedqMo\\nFM15xolWSiwWL5lhz1nSEU6p41PTto0DkOzssa4jRh98PEV30IsRp9YDclhCI+GP\\nOc+iUXSDEaN6Pz7SRzx2SXLEU7pFjicj2PRkwKG2jBkxqz1m6FuLukfrZBMM7ZBp\\nDvEa2hVRAgMBAAECggEABSOeSFy7RdfSLUtHlFd9Q6MFqQ6gKuBBrckbGoe5lrMU\\ncFEmqzlNjH9lZsY+2HyxTWuOaseAtddFdgDbzZoKuKGmc3+VD3/3bCMCrejKIwuJ\\n9KHTbrmIMQ+nvw9YB+yOl0uL8QYoDPo9g58CIkgYIsaM85q3H27mIoS5mdneUrtA\\no76cD01FuKZVcMsOInO7eOHtHdTpxD88mHIsfvhOxte0xfyUzUmpUMqUZElkULKs\\nxkg+ClsCa1kQWy59I2AQ/rJsCQuojAaWKCjnnC6zZZI5/9E1pik0SfJiYiUU3Xfi\\nBoDv0p02KJMA9LL+G6nVhiKIgf+nkVkEmVHsvNy96QKBgQD9aKljLIeiNMO/JxvO\\nKmJhw+XwJ6zXp7gyhzUgajrvfVe7eccyLti1tQVY7icUvP+kdST6oIOJdxaFKOLb\\nnXRR6tzjZTChYeVrL6DITHEHehFnhCtKqCGoB4NHk7nQITEQGW/jHJ0T92S4NiIC\\nFcCXSp5yeLNctvKcCcDDs3bi8wKBgQD6y+qPBPjj25NZ5CG/MLns1sTlXFk4JwzH\\nfUDdx9B151KfVxa8pBg9wPtiAhj44E74+yvaqRKy4iAPRZqES9rVH5tB+MN9UeC1\\nQfXpUOlv4JCbLrX1CcgG0WYfQ9LWKYGKk5nQ1Pa/2tyeDQgiyc6aXojn1wv/fL3T\\nmdQkUtrPqwKBgQC4+w2rN3ZLEflSMFo7xPTMKRRQmqWxRt1PBSPi5ajf6b+BOwQN\\nveSzv9CHelFM8iorAthbm5BpaGUoDxCLAAVJRwi3dcZqB+xQshPMIwDfVFwgFHsF\\npHXtEo7iURPyukf2WJs0Tk7bpFwBnIJ2wyozRmUjariDlYjEHtp4ASlnwQKBgQD2\\nuY8afgDAYK44W6cbaLswFSUEovIevMPkqQMca8tXgmeU299BW4mBjw1/IKMii8EF\\nTkuZRIVht/VkMMxO5DT3P63EnA7thZQznR1oF7Je3qREFhLpamL+2hfGIDoVeCW5\\nh3VlrWzF13D8h8N+Pdxjnya+NZ/XCwfQWGAMD/q1GwKBgDgX/pjME/c0Gz9Pk0wP\\n5e58rF+nytR/jIZHA4kDsQKyGQ/hXt6IujLqK0j56mai0z2hKy49Z1UF/eH/6W0d\\ngdtW1qb8kUJ2xT2BJwaSi0HjdKDBzWqDN8fX+H4kXyrrj5Yp7N5k/RACLqNxys4C\\nRaEjXLytH/Ozx8wkfYBBK9Fn\\n-----END PRIVATE KEY-----\\n",
  client_email: "ragtraderserviceaccount@ragtrader.iam.gserviceaccount.com",
  client_id: "109983293029072188118",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/ragtraderserviceaccount%40ragtrader.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

const storage = new Storage({
  keyFilename: "./src/utils/service-account.json",
});
const bucket = storage.bucket("candlestick_bible");

export const uploadImageToGCS = async (buffer, folder = "queries") => {
  // Generate a unique filename
  const filename = `${folder}/${uuidv4()}.png`;
  const file = bucket.file(filename);

  // Save the file to GCS
  await file.save(buffer, {
    contentType: "image/png", // You can make this dynamic if needed
    public: true,
  });

  // Make the file public (if not already)
  await file.makePublic();

  // Return the public URL
  return file.publicUrl();
};
