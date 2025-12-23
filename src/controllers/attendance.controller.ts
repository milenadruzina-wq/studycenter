import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Attendance, AttendanceStatus } from "../entities/Attendance";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth.middleware";
import { UserRole } from "../entities/User";
import { Student } from "../entities/Student";
import { Group } from "../entities/Group";

const attendanceRepository = AppDataSource.getRepository(Attendance);
const studentRepository = AppDataSource.getRepository(Student);
const groupRepository = AppDataSource.getRepository(Group);

export const getAllAttendances = async (req: AuthRequest, res: Response) => {
  const { groupId, studentId, date, startDate, endDate } = req.query;
  const user = req.user;

  const query = attendanceRepository.createQueryBuilder("attendance")
    .leftJoinAndSelect("attendance.student", "student")
    .leftJoinAndSelect("attendance.group", "group");

  // Если пользователь - студент, показываем только его посещаемость
  if (user?.role === UserRole.STUDENT) {
    const userEmail = user.email;
    if (!userEmail) {
      return res.json([]);
    }
    const student = await studentRepository.findOne({
      where: { email: userEmail },
    });
    if (student) {
      query.where("attendance.studentId = :studentId", { studentId: student.id });
    } else {
      // Если студент не найден в таблице students, возвращаем пустой массив
      return res.json([]);
    }
  } else {
    if (groupId) {
      query.where("attendance.groupId = :groupId", { groupId: parseInt(groupId as string) });
    }

    if (studentId) {
      query.andWhere("attendance.studentId = :studentId", { studentId: parseInt(studentId as string) });
    }
  }

  if (date) {
    query.andWhere("attendance.date = :date", { date });
  } else {
    // Поддержка диапазона дат
    if (startDate) {
      query.andWhere("attendance.date >= :startDate", { startDate });
    }
    if (endDate) {
      query.andWhere("attendance.date <= :endDate", { endDate });
    }
  }

  const attendances = await query
    .orderBy("attendance.date", "ASC")
    .addOrderBy("student.lastName", "ASC")
    .getMany();

  res.json(attendances);
};

export const getAttendanceById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const attendance = await attendanceRepository.findOne({
    where: { id: parseInt(id) },
    relations: ["student", "group"],
  });

  if (!attendance) {
    const error = new AppError("Запись посещаемости не найдена");
    error.statusCode = 404;
    throw error;
  }

  res.json(attendance);
};

export const createAttendance = async (req: Request, res: Response) => {
  const attendanceData = req.body;
  const attendance = attendanceRepository.create(attendanceData);
  const savedAttendance = await attendanceRepository.save(attendance);
  const attendanceId = Array.isArray(savedAttendance) ? savedAttendance[0].id : (savedAttendance as any).id;
  
  const attendanceWithRelations = await attendanceRepository.findOne({
    where: { id: attendanceId },
    relations: ["student", "group"],
  });

  res.status(201).json(attendanceWithRelations);
};

export const updateAttendance = async (req: Request, res: Response) => {
  const { id } = req.params;
  const attendance = await attendanceRepository.findOne({
    where: { id: parseInt(id) },
  });

  if (!attendance) {
    const error = new AppError("Запись посещаемости не найдена");
    error.statusCode = 404;
    throw error;
  }

  attendanceRepository.merge(attendance, req.body);
  const updatedAttendance = await attendanceRepository.save(attendance);
  
  const attendanceWithRelations = await attendanceRepository.findOne({
    where: { id: updatedAttendance.id },
    relations: ["student", "group"],
  });

  res.json(attendanceWithRelations);
};

export const deleteAttendance = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await attendanceRepository.delete(id);

  if (result.affected === 0) {
    const error = new AppError("Запись посещаемости не найдена");
    error.statusCode = 404;
    throw error;
  }

  res.status(204).send();
};

export const getAttendanceStats = async (req: Request, res: Response) => {
  const { groupId, studentId, startDate, endDate } = req.query;

  const query = attendanceRepository.createQueryBuilder("attendance");

  if (groupId) {
    query.where("attendance.groupId = :groupId", { groupId: parseInt(groupId as string) });
  }

  if (studentId) {
    query.andWhere("attendance.studentId = :studentId", { studentId: parseInt(studentId as string) });
  }

  if (startDate) {
    query.andWhere("attendance.date >= :startDate", { startDate });
  }

  if (endDate) {
    query.andWhere("attendance.date <= :endDate", { endDate });
  }

  const attendances = await query.getMany();

  const stats = {
    total: attendances.length,
    present: attendances.filter(a => a.status === AttendanceStatus.PRESENT).length,
    absent: attendances.filter(a => a.status === AttendanceStatus.ABSENT).length,
    late: attendances.filter(a => a.status === AttendanceStatus.LATE).length,
    excused: attendances.filter(a => a.status === AttendanceStatus.EXCUSED).length,
    attendanceRate: attendances.length > 0
      ? ((attendances.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length / attendances.length) * 100).toFixed(2)
      : "0.00",
  };

  res.json(stats);
};

export const getAttendanceStatsByCourse = async (req: Request, res: Response) => {
  const { courseId, startDate, endDate } = req.query;

  const query = attendanceRepository
    .createQueryBuilder("attendance")
    .leftJoinAndSelect("attendance.group", "group")
    .where("group.courseId = :courseId", { courseId: parseInt(courseId as string) });

  if (startDate) {
    query.andWhere("attendance.date >= :startDate", { startDate });
  }

  if (endDate) {
    query.andWhere("attendance.date <= :endDate", { endDate });
  }

  const attendances = await query.getMany();

  const stats = {
    total: attendances.length,
    present: attendances.filter(a => a.status === AttendanceStatus.PRESENT).length,
    absent: attendances.filter(a => a.status === AttendanceStatus.ABSENT).length,
    late: attendances.filter(a => a.status === AttendanceStatus.LATE).length,
    excused: attendances.filter(a => a.status === AttendanceStatus.EXCUSED).length,
    attendanceRate: attendances.length > 0
      ? ((attendances.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length / attendances.length) * 100).toFixed(2)
      : "0.00",
  };

  res.json(stats);
};

export const getAllCoursesAttendanceStats = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const query = attendanceRepository
    .createQueryBuilder("attendance")
    .leftJoinAndSelect("attendance.group", "group")
    .leftJoinAndSelect("group.course", "course");

  if (startDate) {
    query.andWhere("attendance.date >= :startDate", { startDate });
  }

  if (endDate) {
    query.andWhere("attendance.date <= :endDate", { endDate });
  }

  const attendances = await query.getMany();

  // Группируем по курсам
  const courseStatsMap = new Map<number, {
    courseId: number;
    courseName: string;
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  }>();

  attendances.forEach(attendance => {
    const courseId = attendance.group?.courseId;
    const courseName = attendance.group?.course?.name || 'Неизвестный курс';
    
    if (!courseId) return;

    if (!courseStatsMap.has(courseId)) {
      courseStatsMap.set(courseId, {
        courseId,
        courseName,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      });
    }

    const stats = courseStatsMap.get(courseId)!;
    stats.total++;
    
    if (attendance.status === AttendanceStatus.PRESENT) stats.present++;
    else if (attendance.status === AttendanceStatus.ABSENT) stats.absent++;
    else if (attendance.status === AttendanceStatus.LATE) stats.late++;
    else if (attendance.status === AttendanceStatus.EXCUSED) stats.excused++;
  });

  // Преобразуем в массив и добавляем процент посещаемости
  const courseStats = Array.from(courseStatsMap.values()).map(stats => ({
    ...stats,
    attendanceRate: stats.total > 0
      ? (((stats.present + stats.late) / stats.total) * 100).toFixed(2)
      : "0.00",
  }));

  // Общая статистика
  const totalStats = {
    total: attendances.length,
    present: attendances.filter(a => a.status === AttendanceStatus.PRESENT).length,
    absent: attendances.filter(a => a.status === AttendanceStatus.ABSENT).length,
    late: attendances.filter(a => a.status === AttendanceStatus.LATE).length,
    excused: attendances.filter(a => a.status === AttendanceStatus.EXCUSED).length,
    attendanceRate: attendances.length > 0
      ? ((attendances.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length / attendances.length) * 100).toFixed(2)
      : "0.00",
  };

  res.json({
    overall: totalStats,
    byCourse: courseStats,
  });
};
