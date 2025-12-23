import { Router } from "express";
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  markAsPaid,
  getPaymentStats,
  getPaymentsByMonth,
} from "../controllers/payment.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../entities/User";

const router = Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

// Получить все платежи (доступно админу, учителю и студенту - студент видит только свои)
router.get("/", getAllPayments);

// Получить платежи за конкретный месяц (формат: /payments/month/:month где month = YYYY-MM)
router.get("/month/:month", getPaymentsByMonth);

// Получить статистику платежей
router.get("/stats", authorize(UserRole.ADMIN, UserRole.TEACHER), getPaymentStats);

// Получить платеж по ID
router.get("/:id", authorize(UserRole.ADMIN, UserRole.TEACHER), getPaymentById);

// Создать платеж (только админ)
router.post("/", authorize(UserRole.ADMIN), createPayment);

// Отметить платеж как оплаченный (только админ)
router.patch("/:id/mark-paid", authorize(UserRole.ADMIN), markAsPaid);

// Обновить платеж (только админ)
router.put("/:id", authorize(UserRole.ADMIN), updatePayment);

// Удалить платеж (только админ)
router.delete("/:id", authorize(UserRole.ADMIN), deletePayment);

export default router;


