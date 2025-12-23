import { Router } from "express";
import {
  getAllAttendances,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceStats,
  getAttendanceStatsByCourse,
  getAllCoursesAttendanceStats,
} from "../controllers/attendance.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../entities/User";

const router = Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

// Получить посещаемость (студенты видят только свою, преподаватели и админы - все)
router.get("/", getAllAttendances);
router.get("/stats", authorize(UserRole.TEACHER, UserRole.ADMIN), getAttendanceStats);
router.get("/stats/by-course", authorize(UserRole.ADMIN), getAttendanceStatsByCourse);
router.get("/stats/all-courses", authorize(UserRole.ADMIN), getAllCoursesAttendanceStats);
router.get("/:id", authorize(UserRole.TEACHER, UserRole.ADMIN), getAttendanceById);
router.post("/", authorize(UserRole.TEACHER, UserRole.ADMIN), createAttendance);
router.put("/:id", authorize(UserRole.TEACHER, UserRole.ADMIN), updateAttendance);
router.delete("/:id", authorize(UserRole.ADMIN), deleteAttendance);

export default router;
