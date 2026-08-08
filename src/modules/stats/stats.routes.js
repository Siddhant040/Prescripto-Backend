import {getHomepageStats} from "./stats.controller.js";
import { Router } from "express";

const router = Router();

router.get("/", getHomepageStats);

export default router;