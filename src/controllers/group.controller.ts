import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Group } from "../entities/Group";
import { Schedule } from "../entities/Schedule";
import { AppError } from "../middleware/errorHandler";

const groupRepository = AppDataSource.getRepository(Group);
const scheduleRepository = AppDataSource.getRepository(Schedule);

export const getAllGroups = async (req: Request, res: Response) => {
  try {
    const groups = await groupRepository.find({
      relations: ["course", "students", "schedules", "course.teacher"],
      order: { createdAt: "DESC" },
    });
    
    // Фильтруем студентов - показываем только активных
    const groupsWithFilteredStudents = groups.map(group => {
      const groupObj: any = {
        id: group.id,
        name: group.name,
        maxStudents: group.maxStudents,
        startDate: group.startDate,
        endDate: group.endDate,
        startTime: group.startTime,
        endTime: group.endTime,
        courseId: group.courseId,
        course: group.course,
        schedules: group.schedules,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        students: group.students && Array.isArray(group.students)
          ? group.students.filter((student: any) => {
              return student.isActive !== false && student.isActive !== null;
            })
          : []
      };
      return groupObj;
    });
    
    res.json(groupsWithFilteredStudents);
  } catch (error: any) {
    console.error("Error in getAllGroups:", error);
    throw new AppError(error.message || "Ошибка при загрузке групп", 500);
  }
};

export const getGroupById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const group = await groupRepository.findOne({
    where: { id: parseInt(id) },
    relations: ["course", "students", "schedules"],
  });

  if (!group) {
    const error = new AppError("Group not found", 404);
    throw error;
  }

  res.json(group);
};

export const createGroup = async (req: Request, res: Response) => {
  const { daysOfWeek, ...groupData } = req.body;
  
  // Создаем группу
  const group = groupRepository.create(groupData);
  const savedGroup = await groupRepository.save(group);

  // Если указаны дни недели и время занятий, создаем расписание
  if (daysOfWeek && Array.isArray(daysOfWeek) && daysOfWeek.length > 0 && groupData.startTime && groupData.endTime) {
    const schedulesToCreate = daysOfWeek.map((day: string) => {
      return scheduleRepository.create({
        dayOfWeek: day,
        startTime: groupData.startTime,
        endTime: groupData.endTime,
        groupId: savedGroup.id,
      });
    });
    
    await scheduleRepository.save(schedulesToCreate);
    
    // Загружаем группу с расписанием для возврата
    const groupWithSchedules = await groupRepository.findOne({
      where: { id: savedGroup.id },
      relations: ["schedules", "course", "students"],
    });
    
    res.status(201).json(groupWithSchedules);
  } else {
    res.status(201).json(savedGroup);
  }
};

export const updateGroup = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { daysOfWeek, ...groupData } = req.body;
  
  const group = await groupRepository.findOne({
    where: { id: parseInt(id) },
    relations: ["schedules"],
  });

  if (!group) {
    const error = new AppError("Group not found", 404);
    throw error;
  }

  // Обновляем данные группы
  groupRepository.merge(group, groupData);
  const updatedGroup = await groupRepository.save(group);

  // Если указаны дни недели и время занятий, обновляем расписание
  if (daysOfWeek !== undefined && Array.isArray(daysOfWeek) && groupData.startTime && groupData.endTime) {
    // Удаляем старое расписание группы
    if (group.schedules && group.schedules.length > 0) {
      const scheduleIds = group.schedules.map(s => s.id);
      await scheduleRepository.delete(scheduleIds);
    }
    
    // Создаем новое расписание для указанных дней недели
    if (daysOfWeek.length > 0) {
      const schedulesToCreate = daysOfWeek.map((day: string) => {
        return scheduleRepository.create({
          dayOfWeek: day,
          startTime: groupData.startTime,
          endTime: groupData.endTime,
          groupId: updatedGroup.id,
        });
      });
      
      await scheduleRepository.save(schedulesToCreate);
    }
    
    // Загружаем группу с обновленным расписанием
    const groupWithSchedules = await groupRepository.findOne({
      where: { id: updatedGroup.id },
      relations: ["schedules", "course", "students"],
    });
    
    res.json(groupWithSchedules);
  } else {
    res.json(updatedGroup);
  }
};

export const deleteGroup = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await groupRepository.delete(id);

  if (result.affected === 0) {
    const error = new AppError("Group not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(204).send();
};



