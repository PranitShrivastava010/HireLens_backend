import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";
import { errorHandler } from "../src/middlewares/error.middleware";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res, next) => {
  console.log("GET /api/job start");
  try {
    // existing logic here...
    console.log("before prisma call");
    // e.g. const jobs = await prisma.jobs.findMany(...);
    console.log("after prisma call");

    return res.json({ success: true, /* ... */ });
  } catch (err) {
    console.error("GET /api/job error", err);
    return next(err);
  }
});

app.use("/api", routes);

app.use(errorHandler);

export default app;
