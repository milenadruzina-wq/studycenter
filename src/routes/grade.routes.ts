import { Router } from "express";
import {
  getAllGrades,
  getGradeById,
  getGradesByStudent,
  createGrade,
  updateGrade,
  deleteGrade,
} from "../controllers/grade.controller";

const router = Router();

router.get("/", getAllGrades);
router.get("/student/:studentId", getGradesByStudent);
router.get("/:id", getGradeById);
router.post("/", createGrade);
router.put("/:id", updateGrade);
router.delete("/:id", deleteGrade);

export default router;














