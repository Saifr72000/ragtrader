import { useState, useEffect } from "react";
import { apiService } from "../services/api";

const usePolygonBars = () => {
  const [isBarsPopupOpen, setIsBarsPopupOpen] = useState(false);
  const [isBarsLoading, setIsBarsLoading] = useState(false);
  const [barsSlim, setBarsSlim] = useState([]); // filtered bars for attach
  const [barsBlock, setBarsBlock] = useState("");
  const [previewText, setPreviewText] = useState(""); // kept for compatibility (filtered)
  const [rawBars, setRawBars] = useState([]);
  const [rawPreviewText, setRawPreviewText] = useState("");
  const [barsConfig, setBarsConfig] = useState({
    ticker: "X:ETHUSD",
    fromDate: "2025-08-14",
    toDate: "2025-08-14",
    timespan: "minute",
    multiplier: 1,
    limit: 1440,
    fromTime: "00:00",
    toTime: "00:30",
    tz: "UTC",
    mode: "window", // retained but we use only window now
    lastN: 60,
  });

  function formatHHMM(date, timeZone) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    }).formatToParts(date);
    const hh = parts.find((p) => p.type === "hour")?.value || "00";
    const mm = parts.find((p) => p.type === "minute")?.value || "00";
    return `${hh}:${mm}`;
  }

  function minutesSinceMidnight(date, timeZone) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    }).formatToParts(date);
    const hh = Number(parts.find((p) => p.type === "hour")?.value || 0);
    const mm = Number(parts.find((p) => p.type === "minute")?.value || 0);
    return hh * 60 + mm;
  }

  function applyFilter(raw, cfg) {
    const timeZone = cfg.tz || "UTC";
    const sorted = [...raw].sort((a, b) => a.t - b.t);

    // Prefer precise millisecond window in UTC
    if (timeZone === "UTC") {
      const startMs = Date.parse(
        `${cfg.fromDate}T${cfg.fromTime || "00:00"}:00Z`
      );
      const endMs = Date.parse(`${cfg.toDate}T${cfg.toTime || "23:59"}:00Z`);
      const filteredUtc = sorted.filter((b) => b.t >= startMs && b.t < endMs);
      return filteredUtc.map(({ o, c, h, l, t }) => ({
        o,
        c,
        h,
        l,
        t,
        hhmm: formatHHMM(new Date(t), timeZone),
      }));
    }

    // Fallback: timezone-aware by minutes-of-day
    const [fh, fm] = String(cfg.fromTime || "00:00")
      .split(":")
      .map((x) => Number(x));
    const [th, tm] = String(cfg.toTime || "23:59")
      .split(":")
      .map((x) => Number(x));
    const startMin = fh * 60 + fm;
    const endMin = th * 60 + tm;
    const wrap = endMin < startMin;

    const filtered = sorted.filter((b) => {
      const min = minutesSinceMidnight(new Date(b.t), timeZone);
      if (!wrap) return min >= startMin && min < endMin;
      return min >= startMin || min < endMin; // wrap around midnight
    });

    return filtered.map(({ o, c, h, l, t }) => ({
      o,
      c,
      h,
      l,
      t,
      hhmm: formatHHMM(new Date(t), timeZone),
    }));
  }

  const handleFetchBars = async () => {
    try {
      setIsBarsLoading(true);
      const raw = await apiService.fetchPolygonBars(barsConfig);
      setRawBars(raw);
      const tz = barsConfig.tz || "UTC";
      const decorated = Array.isArray(raw)
        ? raw.map((b) => ({ ...b, hhmm: formatHHMM(new Date(b.t), tz) }))
        : [];
      setRawPreviewText(JSON.stringify(decorated, null, 2));
      setBarsSlim([]);
      setBarsBlock("");
      setPreviewText("");
    } catch (err) {
      console.error("Failed to fetch bars:", err);
      setRawBars([]);
      setRawPreviewText("");
      setBarsSlim([]);
      setBarsBlock("");
      setPreviewText("");
    } finally {
      setIsBarsLoading(false);
    }
  };

  const handleApplyFilter = () => {
    try {
      const filtered = applyFilter(rawBars, barsConfig);
      setBarsSlim(filtered.map(({ o, c, h, l, t }) => ({ o, c, h, l, t })));
      setPreviewText(JSON.stringify(filtered, null, 2));

      const meta = `${barsConfig.ticker} ${barsConfig.timespan} mul=${barsConfig.multiplier} tz=${barsConfig.tz}`;
      const range = `window=${barsConfig.fromTime}-${barsConfig.toTime}`;
      const block = `\n\n--- POLYGON_BARS (${meta}, ${range}, n=${
        filtered.length
      }) ---\n${JSON.stringify(
        filtered.map(({ o, c, h, l, t }) => ({ o, c, h, l, t }))
      )}\n--- END POLYGON_BARS ---`;
      setBarsBlock(block);
    } catch (e) {
      console.error("Filter failed:", e);
      setBarsSlim([]);
      setBarsBlock("");
      setPreviewText("");
    }
  };

  const handleInsertBars = (setInputMessage) => {
    if (!barsBlock) return;
    setInputMessage((prev) => `${prev}${barsBlock}`);
    setIsBarsPopupOpen(false);
  };

  const closeBarsModal = () => {
    setIsBarsPopupOpen(false);
  };

  return {
    isBarsPopupOpen,
    setIsBarsPopupOpen,
    isBarsLoading,
    barsConfig,
    setBarsConfig,
    barsSlim,
    barsBlock,
    previewText,
    rawBars,
    rawPreviewText,
    handleFetchBars,
    handleApplyFilter,
    handleInsertBars,
    closeBarsModal,
  };
};

export default usePolygonBars;
