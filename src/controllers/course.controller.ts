import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Course } from "../entities/Course";
import { AppError } from "../middleware/errorHandler";

const courseRepository = AppDataSource.getRepository(Course);

export const getAllCourses = async (req: Request, res: Response) => {
  const courses = await courseRepository.find({
    relations: ["teacher", "groups"],
    order: { createdAt: "DESC" },
  });
  res.json(courses);
};

export const getCourseById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const course = await courseRepository.findOne({
    where: { id: parseInt(id) },
    relations: ["teacher", "groups", "groups.schedules", "groups.students"],
  });

  if (!course) {
    const error = new AppError("Course not found");
    error.statusCode = 404;
    throw error;
  }

  res.json(course);
};

export const createCourse = async (req: Request, res: Response) => {
  const courseData = req.body;
  const course = courseRepository.create(courseData);
  const savedCourse = await courseRepository.save(course);
  res.status(201).json(savedCourse);
};

export const updateCourse = async (req: Request, res: Response) => {
  const { id } = req.params;
  const course = await courseRepository.findOne({
    where: { id: parseInt(id) },
  });

  if (!course) {
    const error = new AppError("Course not found");
    error.statusCode = 404;
    throw error;
  }

  courseRepository.merge(course, req.body);
  const updatedCourse = await courseRepository.save(course);
  res.json(updatedCourse);
};

export const deleteCourse = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await courseRepository.delete(id);

  if (result.affected === 0) {
    const error = new AppError("Course not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(204).send();
};














