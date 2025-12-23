import { Router } from "express";
import {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
} from "../controllers/branch.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../entities/User";

const router = Router();

// Публичные маршруты (для просмотра филиалов)
router.get("/", getAllBranches);
router.get("/:id", getBranchById);

// Защищенные маршруты (только для админов)
router.post("/", authenticate, authorize(UserRole.ADMIN), createBranch);
router.put("/:id", authenticate, authorize(UserRole.ADMIN), updateBranch);
router.delete("/:id", authenticate, authorize(UserRole.ADMIN), deleteBranch);

export default router;











