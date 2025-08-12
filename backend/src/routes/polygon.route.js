import express from "express";
import { fetchPolygonData } from "../controllers/polygon.controller.js";

const router = express.Router();

router.get("/", fetchPolygonData);

export default router;
