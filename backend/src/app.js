import express from "express";
import ingestRoutes from "./routes/ingest.js";

const app = express();
app.use(express.json());

app.use("/api", ingestRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Server is running");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
