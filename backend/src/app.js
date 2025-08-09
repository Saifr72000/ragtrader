import express from "express";
import ingestRoutes from "./routes/ingest.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import chatRoutes from "./routes/chat.route.js";
import messageRoutes from "./routes/message.route.js";
import cors from "cors";

const app = express();

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:4173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(express.json()); // To parse JSON request bodies
app.use(cookieParser());

app.use("/api", ingestRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Server is running");
});

const MONGO_URI =
  process.env.MONGO_DB_URL ||
  "mongodb+srv://saif:QpweWa3Bu9j7X6P2@cluster0.b3uviwl.mongodb.net/ragtrader?retryWrites=true&w=majority";

const connectDB = async () => {
  const maxRetries = 3;
  let retryCount = 0;

  const attemptConnection = async () => {
    try {
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 10000, // Increased to 10 seconds
        socketTimeoutMS: 45000, // Socket timeout
        connectTimeoutMS: 10000, // Connection timeout
        maxPoolSize: 10, // Maximum pool size
        minPoolSize: 1, // Minimum pool size
        maxIdleTimeMS: 30000, // Max idle time
      });
      console.log("✅ Connected to MongoDB!");
      console.log("MongoDB URI:", MONGO_URI);
      return true;
    } catch (error) {
      retryCount++;
      console.error(
        `❌ MongoDB Connection Error (Attempt ${retryCount}/${maxRetries}):`,
        error
      );
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        code: error.code,
      });

      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying connection in 3 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return false;
      } else {
        console.error("❌ Max retries reached. MongoDB connection failed.");
        // Don't exit immediately, let the app continue running
        // process.exit(1); // Commented out to prevent app crash
        return false;
      }
    }
  };

  while (retryCount < maxRetries) {
    const success = await attemptConnection();
    if (success) break;
  }
};

connectDB();

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
