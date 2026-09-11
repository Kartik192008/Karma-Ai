import { Router, type IRouter } from "express";
import healthRouter from "./health";
import geminiRouter from "./gemini";
import recommendationsRouter from "./recommendations";
import mospiRouter from "./mospi";
import quizRouter from "./quiz";

const router: IRouter = Router();

router.use(healthRouter);
router.use(geminiRouter);
router.use(recommendationsRouter);
router.use(mospiRouter);
router.use(quizRouter);

export default router;
