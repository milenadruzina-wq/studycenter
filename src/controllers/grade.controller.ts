import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Grade } from "../entities/Grade";
import { AppError } from "../middleware/errorHandler";

const gradeRepository = AppDataSource.getRepository(Grade);

export const getAllGrades = async (req: Request, res: Response) => {
  const grades = await gradeRepository.find({
    relations: ["student"],
    order: { date: "DESC" },
  });
  res.json(grades);
};

export const getGradeById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const grade = await gradeRepository.findOne({
    where: { id: parseInt(id) },
    relations: ["student"],
  });

  if (!grade) {
    const error = new AppError("Grade not found");
    error.statusCode = 404;
    throw error;
  }

  res.json(grade);
};

export const getGradesByStudent = async (req: Request, res: Response) => {
  const { studentId } = req.params;
  const grades = await gradeRepository.find({
    where: { studentId: parseInt(studentId) },
    relations: ["student"],
    order: { date: "DESC" },
  });
  res.json(grades);
};

export const createGrade = async (req: Request, res: Response) => {
  const gradeData = req.body;
  const grade = gradeRepository.create(gradeData);
  const savedGrade = await gradeRepository.save(grade);
  res.status(201).json(savedGrade);
};

export const updateGrade = async (req: Request, res: Response) => {
  const { id } = req.params;
  const grade = await gradeRepository.findOne({
    where: { id: parseInt(id) },
  });

  if (!grade) {
    const error = new AppError("Grade not found");
    error.statusCode = 404;
    throw error;
  }

  gradeRepository.merge(grade, req.body);
  const updatedGrade = await gradeRepository.save(grade);
  res.json(updatedGrade);
};

export const deleteGrade = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await gradeRepository.delete(id);

  if (result.affected === 0) {
    const error = new AppError("Grade not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(204).send();
};














