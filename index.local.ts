import { startServer } from "./server.local";
// index.local.ts
import "./src/modules/outreach/emailOutreach/email.outreach.queue"; // starts the worker

startServer();
