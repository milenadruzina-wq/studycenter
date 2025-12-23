import { Router } from "express";
import {
  createCourseRequest,
  getCourseRequests,
  getCourseRequestById,
  updateCourseRequest,
  deleteCourseRequest,
} from "../controllers/courseRequest.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../entities/User";

const router = Router();

// Создать запрос на курс (только авторизованные пользователи)
router.post("/", authenticate, createCourseRequest);

// Получить все запросы (админ и преподаватель)
router.get("/", authenticate, authorize(UserRole.ADMIN, UserRole.TEACHER), getCourseRequests);

// Получить запрос по ID
router.get("/:id", authenticate, getCourseRequestById);

// Обновить запрос (админ и преподаватель)
router.patch("/:id", authenticate, authorize(UserRole.ADMIN, UserRole.TEACHER), updateCourseRequest);

// Удалить запрос (админ)
router.delete("/:id", authenticate, authorize(UserRole.ADMIN), deleteCourseRequest);

export default router;

