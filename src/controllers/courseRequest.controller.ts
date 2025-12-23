import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { CourseRequest, RequestStatus } from "../entities/CourseRequest";
import { AppError } from "../middleware/errorHandler";
import { Course } from "../entities/Course";
import { User } from "../entities/User";

const courseRequestRepository = AppDataSource.getRepository(CourseRequest);
const courseRepository = AppDataSource.getRepository(Course);
const userRepository = AppDataSource.getRepository(User);

export const createCourseRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { courseId, message } = req.body;

    if (!userId) {
      const error = new AppError("Пользователь не авторизован");
      error.statusCode = 401;
      throw error;
    }

    if (!courseId) {
      const error = new AppError("ID курса обязателен");
      error.statusCode = 400;
      throw error;
    }

    // Проверяем существование курса
    const course = await courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      const error = new AppError("Курс не найден");
      error.statusCode = 404;
      throw error;
    }

    // Проверяем, нет ли уже активного запроса от этого пользователя на этот курс
    const existingRequest = await courseRequestRepository.findOne({
      where: {
        userId,
        courseId,
        status: RequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      const error = new AppError("У вас уже есть активный запрос на этот курс");
      error.statusCode = 400;
      throw error;
    }

    const courseRequest = courseRequestRepository.create({
      userId,
      courseId,
      message: message || null,
      status: RequestStatus.PENDING,
    });

    const savedRequest = await courseRequestRepository.save(courseRequest);

    const requestWithRelations = await courseRequestRepository.findOne({
      where: { id: savedRequest.id },
      relations: ["user", "course"],
    });

    res.status(201).json(requestWithRelations);
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = new AppError("Ошибка при создании запроса на курс");
    appError.statusCode = 500;
    throw appError;
  }
};

export const getCourseRequests = async (req: Request, res: Response) => {
  const { status, courseId, userId } = req.query;

  const where: any = {};
  if (status) where.status = status;
  if (courseId) where.courseId = parseInt(courseId as string);
  if (userId) where.userId = parseInt(userId as string);

  const requests = await courseRequestRepository.find({
    where,
    relations: ["user", "course"],
    order: { createdAt: "DESC" },
  });

  res.json(requests);
};

export const getCourseRequestById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const request = await courseRequestRepository.findOne({
    where: { id: parseInt(id) },
    relations: ["user", "course"],
  });

  if (!request) {
    const error = new AppError("Запрос не найден");
    error.statusCode = 404;
    throw error;
  }

  res.json(request);
};

export const updateCourseRequest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, message } = req.body;

  const courseRequest = await courseRequestRepository.findOne({
    where: { id: parseInt(id) },
    relations: ["user", "course"],
  });

  if (!courseRequest) {
    const error = new AppError("Запрос не найден");
    error.statusCode = 404;
    throw error;
  }

  if (status) {
    if (!Object.values(RequestStatus).includes(status)) {
      const error = new AppError("Некорректный статус");
      error.statusCode = 400;
      throw error;
    }
    courseRequest.status = status;
  }

  if (message !== undefined) {
    courseRequest.message = message;
  }

  const updatedRequest = await courseRequestRepository.save(courseRequest);

  res.json(updatedRequest);
};

export const deleteCourseRequest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await courseRequestRepository.delete(id);

  if (result.affected === 0) {
    const error = new AppError("Запрос не найден");
    error.statusCode = 404;
    throw error;
  }

  res.status(204).send();
};









