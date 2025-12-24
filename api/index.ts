import serverless from "serverless-http";
import app from "./app";

export const config = {
  api: {
    bodyParser: false
  }
};

export default serverless(app);
