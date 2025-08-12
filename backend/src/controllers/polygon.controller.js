import axios from "axios";
import { restClient } from "@polygon.io/client-js";

const apiKey = process.env.POLYGON_API_KEY;

export const fetchPolygonData = async (req, res) => {
  const { fromDate, toDate, timespan = "day" } = req.query;

  // Parse numeric values with proper defaults and validation
  const multiplier = parseInt(req.query.multiplier) || 1;
  const limit = parseInt(req.query.limit) || 120;

  console.log("Raw query params:", req.query);
  console.log("Parsed values:", {
    fromDate,
    toDate,
    timespan,
    multiplier,
    limit,
  });

  if (!apiKey) {
    return res.status(500).json({ error: "Polygon API key not configured" });
  }

  // Validate required parameters
  if (!fromDate || !toDate) {
    return res.status(400).json({
      error: "Missing required parameters: fromDate and toDate are required",
    });
  }

  try {
    const url =
      `https://api.polygon.io/v2/aggs/ticker/I:NDX/range/${multiplier}/${timespan}/${fromDate}/${toDate}` +
      `?adjusted=true&sort=asc&limit=${limit}&apiKey=${apiKey}`;

    console.log("Polygon API URL:", url);

    const response = await axios.get(url);
    res.status(200).json(response.data);
  } catch (error) {
    console.log(error);

    res.status(500).json({ error: error?.message || "Polygon fetch failed" });
  }
};
