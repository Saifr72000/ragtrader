import axios from "axios";
import { restClient } from "@polygon.io/client-js";

const apiKey = process.env.POLYGON_API_KEY;

export const fetchPolygonData = async (req, res) => {
  const { fromDate, toDate, timespan = "day" } = req.query;

  // Parse numeric values with proper defaults and validation
  const multiplier = parseInt(req.query.multiplier) || 1;
  const limit = parseInt(req.query.limit) || 120;
  const max = parseInt(req.query.max) || 5000; // safety cap when paging
  const ticker = "X:BTCUSD";

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
    const buildUrl = (cursorUrl) => {
      if (cursorUrl) return cursorUrl;
      return (
        `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${fromDate}/${toDate}` +
        `?adjusted=true&sort=asc&limit=${limit}`
      );
    };

    const results = [];
    let url = buildUrl(null);

    // Page until next_url is absent or we reach max
    while (url && results.length < max) {
      const finalUrl = url.includes("apiKey=")
        ? url
        : `${url}&apiKey=${apiKey}`;
      const response = await axios.get(finalUrl);
      const data = response.data || {};

      if (Array.isArray(data.results)) {
        for (const r of data.results) {
          results.push(r);
          if (results.length >= max) break;
        }
      }

      url = data.next_url || null; // if present, continue paging
      // If Polygon returns fewer than requested, stop early
      if (!data.next_url) break;
    }

    res.status(200).json({
      results,
      count: results.length,
      truncated: results.length >= max,
      ticker,
      timespan,
      multiplier,
      fromDate,
      toDate,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({ error: error?.message || "Polygon fetch failed" });
  }
};
