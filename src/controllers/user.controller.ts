import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User, UserRole } from "../entities/User";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth.middleware";

const userRepository = AppDataSource.getRepository(User);

export const getAllUsers = async (req: Request, res: Response) => {
  const users = await userRepository.find({
    order: { createdAt: "DESC" },
  });

  // Убираем пароли из ответа
  const usersWithoutPasswords = users.map(({ password, ...user }) => user);

  res.json(usersWithoutPasswords);
};

export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await userRepository.findOne({
    where: { id: parseInt(id) },
  });

  if (!user) {
    const error = new AppError("Пользователь не найден");
    error.statusCode = 404;
    throw error;
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
};

export const updateUserRole = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!Object.values(UserRole).includes(role)) {
    const error = new AppError("Недопустимая роль");
    error.statusCode = 400;
    throw error;
  }

  const user = await userRepository.findOne({
    where: { id: parseInt(id) },
  });

  if (!user) {
    const error = new AppError("Пользователь не найден");
    error.statusCode = 404;
    throw error;
  }

  // Админ не может изменить свою роль
  if (user.id === req.user?.id && role !== UserRole.ADMIN) {
    const error = new AppError("Вы не можете изменить свою роль");
    error.statusCode = 400;
    throw error;
  }

  user.role = role;
  const updatedUser = await userRepository.save(user);

  const { password: _, ...userWithoutPassword } = updatedUser;
  res.json(userWithoutPassword);
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await userRepository.findOne({
    where: { id: parseInt(id) },
  });

  if (!user) {
    const error = new AppError("Пользователь не найден");
    error.statusCode = 404;
    throw error;
  }

  // Обновляем только разрешенные поля
  const { password, role, ...updateData } = req.body;
  userRepository.merge(user, updateData);

  const updatedUser = await userRepository.save(user);
  const { password: _, ...userWithoutPassword } = updatedUser;

  res.json(userWithoutPassword);
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await userRepository.delete(id);

  if (result.affected === 0) {
    const error = new AppError("Пользователь не найден");
    error.statusCode = 404;
    throw error;
  }

  res.status(204).send();
};













