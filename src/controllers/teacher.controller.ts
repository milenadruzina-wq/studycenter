import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Teacher } from "../entities/Teacher";
import { User, UserRole } from "../entities/User";
import { Course } from "../entities/Course";
import { AppError } from "../middleware/errorHandler";

const teacherRepository = AppDataSource.getRepository(Teacher);
const userRepository = AppDataSource.getRepository(User);
const courseRepository = AppDataSource.getRepository(Course);

export const getAllTeachers = async (req: Request, res: Response) => {
  const teachers = await teacherRepository.find({
    relations: ["courses", "user"],
    order: { createdAt: "DESC" },
  });
  res.json(teachers);
};

export const getTeacherById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const teacher = await teacherRepository.findOne({
    where: { id: parseInt(id) },
    relations: ["courses", "user"],
  });

  if (!teacher) {
    const error = new AppError("Teacher not found");
    error.statusCode = 404;
    throw error;
  }

  res.json(teacher);
};

export const createTeacher = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, specialization, bio, username, password, isActive, courseIds } = req.body;

    // Валидация обязательных полей
    if (!firstName || !lastName) {
      const error = new AppError("Имя и фамилия обязательны");
      error.statusCode = 400;
      throw error;
    }

    // Проверка на существующего преподавателя с таким email (только если email указан)
    if (email && email.trim() !== '') {
      const existingTeacher = await teacherRepository.findOne({
        where: { email },
      });

      if (existingTeacher) {
        const error = new AppError("Преподаватель с таким email уже существует");
        error.statusCode = 400;
        throw error;
      }
    }

    // Создаем пользователя, если указаны логин и пароль
    let user: User | null = null;
    if (username && password) {
      // Проверка на существующего пользователя (по логину и email, если email указан)
      const whereConditions: any[] = [{ username }];
      if (email && email.trim() !== '') {
        whereConditions.push({ email });
      }
      
      const existingUser = await userRepository.findOne({
        where: whereConditions,
      });

      if (existingUser) {
        const error = new AppError(
          existingUser.username === username 
            ? "Пользователь с таким логином уже существует"
            : "Пользователь с таким email уже существует"
        );
        error.statusCode = 400;
        throw error;
      }

      // Валидация пароля
      if (password.length < 6) {
        const error = new AppError("Пароль должен содержать минимум 6 символов");
        error.statusCode = 400;
        throw error;
      }

      user = userRepository.create({
        username,
        password,
        email: email && email.trim() !== '' ? email.trim() : null,
        firstName,
        lastName,
        role: UserRole.TEACHER,
        isActive: isActive !== undefined ? isActive : true,
      });

      await user.hashPassword();
      await userRepository.save(user);
    }

    // Создаем преподавателя
    const teacherData: any = {
      firstName,
      lastName,
      email: email && email.trim() !== '' ? email.trim() : null,
      isActive: isActive !== undefined ? isActive : true,
    };

    if (phone) teacherData.phone = phone;
    if (specialization) teacherData.specialization = specialization;
    if (bio) teacherData.bio = bio;
    if (user) teacherData.userId = user.id;

    const teacher = teacherRepository.create(teacherData);
    const savedTeacher = await teacherRepository.save(teacher);

    // Обновляем курсы, закрепляя их за преподавателем
    if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
      const courseIdsNumbers = courseIds.map(id => parseInt(id)).filter(id => !isNaN(id));
      if (courseIdsNumbers.length > 0) {
        await courseRepository
          .createQueryBuilder()
          .update(Course)
          .set({ teacherId: savedTeacher.id })
          .where("id IN (:...ids)", { ids: courseIdsNumbers })
          .execute();
      }
    }

    // Загружаем преподавателя с пользователем и курсами для возврата
    const teacherWithUser = await teacherRepository.findOne({
      where: { id: savedTeacher.id },
      relations: ["user", "courses"],
    });

    res.status(201).json(teacherWithUser);
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = new AppError("Ошибка при создании преподавателя");
    appError.statusCode = 500;
    throw appError;
  }
};

export const updateTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, password, isActive, ...teacherData } = req.body;

    const teacher = await teacherRepository.findOne({
      where: { id: parseInt(id) },
      relations: ["user"],
    });

    if (!teacher) {
      const error = new AppError("Преподаватель не найден");
      error.statusCode = 404;
      throw error;
    }

    // Обрабатываем email - если пустой, то null
    if (teacherData.email !== undefined) {
      teacherData.email = teacherData.email && teacherData.email.trim() !== '' ? teacherData.email.trim() : null;
    }
    
    // Обновляем данные преподавателя (кроме isActive, его обработаем отдельно)
    teacherRepository.merge(teacher, teacherData);
    
    // Обновляем статус активности преподавателя сразу (если передан)
    if (isActive !== undefined) {
      teacher.isActive = isActive;
    }

    // Если указаны логин и пароль, но у преподавателя еще нет пользователя - создаем
    if (username && username.trim() !== '' && password && password.trim() !== '' && !teacher.user) {
      // Проверка на существующего пользователя (по логину и email, если email указан)
      const whereConditions: any[] = [{ username }];
      if (teacher.email && teacher.email.trim() !== '') {
        whereConditions.push({ email: teacher.email });
      }
      
      const existingUser = await userRepository.findOne({
        where: whereConditions,
      });

      if (existingUser) {
        const error = new AppError(
          existingUser.username === username 
            ? "Пользователь с таким логином уже существует"
            : "Пользователь с таким email уже существует"
        );
        error.statusCode = 400;
        throw error;
      }

      // Валидация пароля
      if (password.length < 6) {
        const error = new AppError("Пароль должен содержать минимум 6 символов");
        error.statusCode = 400;
        throw error;
      }

      const user = userRepository.create({
        username,
        password,
        email: teacher.email && teacher.email.trim() !== '' ? teacher.email : null,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        role: UserRole.TEACHER,
        isActive: isActive !== undefined ? isActive : teacher.isActive,
      });

      await user.hashPassword();
      await userRepository.save(user);
      teacher.userId = user.id;
    } else if (teacher.user) {
      // Обновляем существующего пользователя
      // Обновляем логин, если указан и он отличается от текущего
      if (username && username.trim() !== '') {
        // Если логин совпадает с текущим - ничего не делаем, это нормально
        if (username !== teacher.user.username) {
          // Проверяем, что новый логин не занят другим пользователем
          const existingUser = await userRepository.findOne({
            where: { username },
          });

          // Если нашли пользователя с таким логином и это не текущий пользователь - ошибка
          if (existingUser && existingUser.id !== teacher.user.id) {
            const error = new AppError("Пользователь с таким логином уже существует");
            error.statusCode = 400;
            throw error;
          }

          // Обновляем логин только если он действительно изменился
          teacher.user.username = username;
        }
        // Если логин не изменился - просто пропускаем обновление логина
      }

      // Обновляем пароль, если указан
      if (password && password.trim() !== '') {
        if (password.length < 6) {
          const error = new AppError("Пароль должен содержать минимум 6 символов");
          error.statusCode = 400;
          throw error;
        }
        teacher.user.password = password;
        await teacher.user.hashPassword();
      }

      // Обновляем статус активности пользователя (если еще не обновлен выше)
      if (isActive !== undefined && teacher.user) {
        teacher.user.isActive = isActive;
      }

      await userRepository.save(teacher.user);
    } else if (username && username.trim() !== '' && (!password || password.trim() === '')) {
      // Если указан только логин без пароля, но у преподавателя нет пользователя
      // Проверяем, что такого логина еще нет
      const existingUser = await userRepository.findOne({
        where: { username },
      });

      if (existingUser) {
        const error = new AppError("Пользователь с таким логином уже существует");
        error.statusCode = 400;
        throw error;
      }
      // Если логина нет, но не указан пароль - не создаем пользователя (требуется пароль)
    }

    const updatedTeacher = await teacherRepository.save(teacher);

    // Обновляем курсы, закрепляя их за преподавателем
    if (courseIds !== undefined) {
      const teacherId = parseInt(id);
      
      // Сначала убираем преподавателя у всех курсов, которые были за ним закреплены
      await courseRepository
        .createQueryBuilder()
        .update(Course)
        .set({ teacherId: null })
        .where("teacherId = :teacherId", { teacherId })
        .execute();

      // Затем закрепляем выбранные курсы за преподавателем
      if (Array.isArray(courseIds) && courseIds.length > 0) {
        const courseIdsNumbers = courseIds.map(id => parseInt(id)).filter(id => !isNaN(id));
        if (courseIdsNumbers.length > 0) {
          await courseRepository
            .createQueryBuilder()
            .update(Course)
            .set({ teacherId: teacherId })
            .where("id IN (:...ids)", { ids: courseIdsNumbers })
            .execute();
        }
      }
    }

    // Загружаем обновленного преподавателя с пользователем и курсами
    const teacherWithUser = await teacherRepository.findOne({
      where: { id: updatedTeacher.id },
      relations: ["user", "courses"],
    });

    res.json(teacherWithUser);
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = new AppError("Ошибка при обновлении преподавателя");
    appError.statusCode = 500;
    throw appError;
  }
};

export const deleteTeacher = async (req: Request, res: Response) => {
  const { id } = req.params;
  const teacher = await teacherRepository.findOne({
    where: { id: parseInt(id) },
    relations: ["user"],
  });

  if (!teacher) {
    const error = new AppError("Преподаватель не найден");
    error.statusCode = 404;
    throw error;
  }

  // Если у преподавателя есть пользовательский аккаунт, удаляем его
  if (teacher.user) {
    await userRepository.delete(teacher.user.id);
  }

  const result = await teacherRepository.delete(id);

  if (result.affected === 0) {
    const error = new AppError("Преподаватель не найден");
    error.statusCode = 404;
    throw error;
  }

  res.status(204).send();
};






