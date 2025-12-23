import { Router } from "express";
import studentRoutes from "./student.routes";
import teacherRoutes from "./teacher.routes";
import courseRoutes from "./course.routes";
import groupRoutes from "./group.routes";
import scheduleRoutes from "./schedule.routes";
import gradeRoutes from "./grade.routes";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import attendanceRoutes from "./attendance.routes";
import paymentRoutes from "./payment.routes";
import branchRoutes from "./branch.routes";
import courseRequestRoutes from "./courseRequest.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/students", studentRoutes);
router.use("/teachers", teacherRoutes);
router.use("/courses", courseRoutes);
router.use("/groups", groupRoutes);
router.use("/schedules", scheduleRoutes);
router.use("/grades", gradeRoutes);
router.use("/attendances", attendanceRoutes);
router.use("/payments", paymentRoutes);
router.use("/branches", branchRoutes);
router.use("/course-requests", courseRequestRoutes);

export default router;


