import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";
// import { errorHandler } from "../src/middlewares/error.middleware";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
]

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "HireLens backend running" });
});

app.use("/api", routes);

// app.use(errorHandler);

export default app;
