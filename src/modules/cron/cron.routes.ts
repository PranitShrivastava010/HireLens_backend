import { Router } from "express";
import { runEnrichCronController, runFetchCronController } from "./cron.controller";

const router = Router();

router.get("/fetch-jobs", runFetchCronController);
router.get("/enrich-jobs", runEnrichCronController);

export default router;
