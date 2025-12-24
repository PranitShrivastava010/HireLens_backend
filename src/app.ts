import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";
// import { errorHandler } from "../src/middlewares/error.middleware";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "HireLens backend running" });
});

app.get("/api/job", (req, res) => {
  return res.json({ status: "ok job" });
});

// app.use(errorHandler);

export default app;
