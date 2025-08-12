import axios from "axios";
import { restClient } from "@polygon.io/client-js";

const apiKey = "O2Z4tlsyYuO00SwjXPpfA1dvDM00poDX";

export const fetchPolygonData = async (req, res) => {
  const {
    fromDate,
    toDate,
    timespan = "day",
    multiplier = 1,
    limit = 120,
  } = req.query; // read from query for GET

  try {
    const url =
      `https://api.polygon.io/v2/aggs/ticker/I:NDX/range/${multiplier}/${timespan}/${fromDate}/${toDate}` +
      `?adjusted=true&sort=asc&limit=${limit}&apiKey=${apiKey}`;

    const response = await axios.get(url);
    console.log("Response:", response.status);
    res.status(200).json(response.data);
  } catch (error) {
    console.error("An error happened:", error);
    res.status(500).json({ error: error?.message || "Polygon fetch failed" });
  }
};
