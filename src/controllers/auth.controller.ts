import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../data-source";
import { User, UserRole } from "../entities/User";
import { AppError } from "../middleware/errorHandler";

const userRepository = AppDataSource.getRepository(User);
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

const generateToken = (userId: number): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, email, firstName, lastName } = req.body;

    // Валидация обязательных полей
    if (!username || !password || !email || !firstName || !lastName) {
      const error = new AppError("Все поля обязательны для заполнения");
      error.statusCode = 400;
      throw error;
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = new AppError("Некорректный формат email");
      error.statusCode = 400;
      throw error;
    }

    // Валидация пароля
    if (password.length < 6) {
      const error = new AppError("Пароль должен содержать минимум 6 символов");
      error.statusCode = 400;
      throw error;
    }

    // Проверка на существующего пользователя
    const existingUser = await userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      const error = new AppError(
        existingUser.username === username 
          ? "Пользователь с таким именем уже существует"
          : "Пользователь с таким email уже существует"
      );
      error.statusCode = 400;
      throw error;
    }

    // Создание нового пользователя (по умолчанию роль - обычный пользователь)
    const user = userRepository.create({
      username,
      password,
      email,
      firstName,
      lastName,
      role: UserRole.USER,
    });

    await user.hashPassword();
    const savedUser = await userRepository.save(user);

    // Убираем пароль из ответа
    const { password: _, ...userWithoutPassword } = savedUser;

    const token = generateToken(savedUser.id);

    res.status(201).json({
      user: userWithoutPassword,
      token,
    });
  } catch (error: any) {
    // Если это уже AppError, пробрасываем дальше
    if (error instanceof AppError) {
      throw error;
    }
    // Иначе создаем новую ошибку
    const appError = new AppError(error.message || "Ошибка при регистрации");
    appError.statusCode = 500;
    throw appError;
  }
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    const error = new AppError("Username и пароль обязательны");
    error.statusCode = 400;
    throw error;
  }

  const user = await userRepository.findOne({
    where: { username, isActive: true },
  });

  if (!user) {
    const error = new AppError("Неверный username или пароль");
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    const error = new AppError("Неверный username или пароль");
    error.statusCode = 401;
    throw error;
  }

  // Убираем пароль из ответа
  const { password: _, ...userWithoutPassword } = user;

  const token = generateToken(user.id);

  res.json({
    user: userWithoutPassword,
    token,
  });
};

export const getMe = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    const error = new AppError("Пользователь не найден");
    error.statusCode = 404;
    throw error;
  }

  const user = await userRepository.findOne({
    where: { id: userId },
  });

  if (!user) {
    const error = new AppError("Пользователь не найден");
    error.statusCode = 404;
    throw error;
  }

  const { password: _, ...userWithoutPassword } = user;

  res.json(userWithoutPassword);
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      const error = new AppError("Email обязателен");
      error.statusCode = 400;
      throw error;
    }

    const user = await userRepository.findOne({
      where: { email },
    });

    // Для безопасности всегда возвращаем успешный ответ, даже если пользователь не найден
    if (!user) {
      res.json({
        message: "Если пользователь с таким email существует, на него будет отправлена инструкция по восстановлению пароля",
      });
      return;
    }

    // Генерируем токен для сброса пароля
    const crypto = require("crypto");
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Токен действителен 1 час

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await userRepository.save(user);

    // В реальном приложении здесь должна быть отправка email с токеном
    // Для демонстрации возвращаем токен в ответе (в продакшене этого делать нельзя!)
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;

    console.log(`Reset password link for ${email}: ${resetUrl}`);

    res.json({
      message: "Если пользователь с таким email существует, на него будет отправлена инструкция по восстановлению пароля",
      // В продакшене убрать эту строку:
      resetToken: process.env.NODE_ENV === "development" ? resetToken : undefined,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = new AppError("Ошибка при запросе восстановления пароля");
    appError.statusCode = 500;
    throw appError;
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      const error = new AppError("Токен и новый пароль обязательны");
      error.statusCode = 400;
      throw error;
    }

    if (newPassword.length < 6) {
      const error = new AppError("Пароль должен содержать минимум 6 символов");
      error.statusCode = 400;
      throw error;
    }

    const user = await userRepository.findOne({
      where: { resetPasswordToken: token },
    });

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      const error = new AppError("Недействительный или истекший токен");
      error.statusCode = 400;
      throw error;
    }

    // Устанавливаем новый пароль
    user.password = newPassword;
    await user.hashPassword();
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await userRepository.save(user);

    res.json({
      message: "Пароль успешно изменен",
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = new AppError("Ошибка при сбросе пароля");
    appError.statusCode = 500;
    throw appError;
  }
};


