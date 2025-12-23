import { Router } from "express";
import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  restoreStudent,
  getStudentByEmail,
  enrollInCourse,
} from "../controllers/student.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../entities/User";

const router = Router();

// Публичные маршруты (для студентов)
router.get("/me", authenticate, getStudentByEmail);
router.post("/enroll", authenticate, enrollInCourse);

// Защищенные маршруты (только для админов и учителей)
router.get("/", authenticate, authorize(UserRole.ADMIN, UserRole.TEACHER), getAllStudents);
router.get("/:id", authenticate, authorize(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT), getStudentById);
router.post("/", authenticate, authorize(UserRole.ADMIN, UserRole.TEACHER), createStudent);
router.put("/:id", authenticate, authorize(UserRole.ADMIN), updateStudent);
router.patch("/:id/restore", authenticate, authorize(UserRole.ADMIN), restoreStudent);
router.delete("/:id", authenticate, authorize(UserRole.ADMIN), deleteStudent);

export default router;



