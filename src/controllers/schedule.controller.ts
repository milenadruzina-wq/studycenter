import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Schedule } from "../entities/Schedule";
import { AppError } from "../middleware/errorHandler";

const scheduleRepository = AppDataSource.getRepository(Schedule);

export const getAllSchedules = async (req: Request, res: Response) => {
  const schedules = await scheduleRepository.find({
    relations: ["group"],
    order: { dayOfWeek: "ASC", startTime: "ASC" },
  });
  res.json(schedules);
};

export const getScheduleById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const schedule = await scheduleRepository.findOne({
    where: { id: parseInt(id) },
    relations: ["group"],
  });

  if (!schedule) {
    const error = new AppError("Schedule not found");
    error.statusCode = 404;
    throw error;
  }

  res.json(schedule);
};

export const getSchedulesByGroup = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const schedules = await scheduleRepository.find({
    where: { groupId: parseInt(groupId) },
    relations: ["group"],
    order: { dayOfWeek: "ASC", startTime: "ASC" },
  });
  res.json(schedules);
};

export const createSchedule = async (req: Request, res: Response) => {
  const { daysOfWeek, startTime, endTime, groupId } = req.body;
  
  // Если переданы несколько дней недели, создаем расписание для каждого дня
  if (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
    const schedules = daysOfWeek.map((day: string) => 
      scheduleRepository.create({
        dayOfWeek: day,
        startTime,
        endTime,
        groupId,
      })
    );
    const savedSchedules = await scheduleRepository.save(schedules);
    res.status(201).json(savedSchedules);
  } else {
    // Обратная совместимость: если передан один день
    const scheduleData = req.body;
    const schedule = scheduleRepository.create(scheduleData);
    const savedSchedule = await scheduleRepository.save(schedule);
    res.status(201).json(savedSchedule);
  }
};

export const updateSchedule = async (req: Request, res: Response) => {
  const { id } = req.params;
  const schedule = await scheduleRepository.findOne({
    where: { id: parseInt(id) },
  });

  if (!schedule) {
    const error = new AppError("Schedule not found");
    error.statusCode = 404;
    throw error;
  }

  scheduleRepository.merge(schedule, req.body);
  const updatedSchedule = await scheduleRepository.save(schedule);
  res.json(updatedSchedule);
};

export const deleteSchedule = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await scheduleRepository.delete(id);

  if (result.affected === 0) {
    const error = new AppError("Schedule not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(204).send();
};




