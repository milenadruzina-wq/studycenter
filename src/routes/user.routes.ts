import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUser,
  deleteUser,
} from "../controllers/user.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../entities/User";

const router = Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

// Только админ может управлять пользователями
router.get("/", authorize(UserRole.ADMIN), getAllUsers);
router.get("/:id", authorize(UserRole.ADMIN), getUserById);
router.put("/:id/role", authorize(UserRole.ADMIN), updateUserRole);
router.put("/:id", authorize(UserRole.ADMIN), updateUser);
router.delete("/:id", authorize(UserRole.ADMIN), deleteUser);

export default router;













