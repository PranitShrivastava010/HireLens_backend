import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";
import cookieParser from "cookie-parser";

const app = express();

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
];

const configuredOrigins = (process.env.FRONTEND_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...defaultAllowedOrigins,
  ...configuredOrigins,
]);

const slowRequestThresholdMs = Number(process.env.SLOW_REQUEST_MS ?? 1000);
const logAllRequests = process.env.LOG_ALL_REQUESTS === "true";
const allowChromeExtensionOrigins =
  process.env.ALLOW_CHROME_EXTENSION_ORIGINS !== "false";

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (
        allowedOrigins.has(origin) ||
        (allowChromeExtensionOrigins && origin.startsWith("chrome-extension://"))
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    if (logAllRequests || durationMs >= slowRequestThresholdMs) {
      console.log(
        `${req.method} ${req.originalUrl} -> ${res.statusCode} in ${durationMs.toFixed(1)}ms`
      );
    }
  });

  next();
});

app.get("/", (_req, res) => {
  res.json({ status: "HireLens backend running" });
});

app.use("/api", routes);

export default app;
