import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";
// import { errorHandler } from "../src/middlewares/error.middleware";

const app = express();

app.use(cors({
  origin: "http://localhost:5174",
  credentials: true,
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "HireLens backend running" });
});

app.use("/api", routes);

// app.use(errorHandler);

export default app;
