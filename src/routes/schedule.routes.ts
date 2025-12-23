import { Router } from "express";
import {
  getAllSchedules,
  getScheduleById,
  getSchedulesByGroup,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "../controllers/schedule.controller";

const router = Router();

router.get("/", getAllSchedules);
router.get("/group/:groupId", getSchedulesByGroup);
router.get("/:id", getScheduleById);
router.post("/", createSchedule);
router.put("/:id", updateSchedule);
router.delete("/:id", deleteSchedule);

export default router;














