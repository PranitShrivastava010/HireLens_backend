import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";
// import { errorHandler } from "../src/middlewares/error.middleware";
import cookieParser from "cookie-parser"

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

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients like GitHub Actions, Postman, and server-to-server calls.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json());

app.use(cookieParser())

app.get("/", (req, res) => {
  res.json({ status: "HireLens backend running" });
});

app.use("/api", routes);

// app.use(errorHandler);

export default app;
