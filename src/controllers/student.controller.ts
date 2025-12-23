import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Student } from "../entities/Student";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth.middleware";
import { User, UserRole } from "../entities/User";
import { Group } from "../entities/Group";
import { Payment, PaymentStatus } from "../entities/Payment";
import { Course } from "../entities/Course";
import { Schedule } from "../entities/Schedule";

const studentRepository = AppDataSource.getRepository(Student);
const groupRepository = AppDataSource.getRepository(Group);
const userRepository = AppDataSource.getRepository(User);
const paymentRepository = AppDataSource.getRepository(Payment);
const courseRepository = AppDataSource.getRepository(Course);
const scheduleRepository = AppDataSource.getRepository(Schedule);

// Функция для расчета стоимости за месяц на основе количества занятий
const calculateMonthlyPayment = async (
  coursePrice: number, 
  studentCreatedDate: Date, 
  groupId: number
): Promise<number> => {
  // Цена курса - это цена за полный месяц (8 занятий при 2 занятиях в неделю)
  // Рассчитываем пропорционально количеству занятий в оставшиеся дни месяца
  
  const now = new Date(studentCreatedDate);
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Получаем расписание группы
  const schedules = await scheduleRepository.find({
    where: { groupId: groupId },
  });
  
  // Подсчитываем уникальные дни недели (количество занятий в неделю)
  const uniqueDays = new Set(schedules.map(s => s.dayOfWeek));
  const classesPerWeek = uniqueDays.size || 2; // По умолчанию 2 занятия в неделю
  
  // Стандартное количество занятий в месяц (8 занятий)
  const standardClassesPerMonth = 8;
  const pricePerClass = coursePrice / standardClassesPerMonth;
  
  // Рассчитываем количество занятий в оставшиеся дни месяца
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  // Находим все даты занятий от даты создания студента до конца месяца
  let classesCount = 0;
  
  // Маппинг дней недели JavaScript (0-6) на названия дней
  const dayNamesMap: { [key: number]: string } = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday'
  };
  
  // Нормализуем названия дней из расписания (приводим к стандартному формату)
  const normalizeDayName = (day: string): string => {
    const lower = day.toLowerCase();
    if (lower.includes('понедельник') || lower.includes('monday')) return 'Monday';
    if (lower.includes('вторник') || lower.includes('tuesday')) return 'Tuesday';
    if (lower.includes('среда') || lower.includes('wednesday')) return 'Wednesday';
    if (lower.includes('четверг') || lower.includes('thursday')) return 'Thursday';
    if (lower.includes('пятница') || lower.includes('friday')) return 'Friday';
    if (lower.includes('суббота') || lower.includes('saturday')) return 'Saturday';
    if (lower.includes('воскресенье') || lower.includes('sunday')) return 'Sunday';
    return day; // Возвращаем как есть, если не распознано
  };
  
  const scheduleDays = Array.from(uniqueDays).map(normalizeDayName);
  
  // Проходим по всем дням от даты создания до конца месяца
  const currentDate = new Date(now);
  while (currentDate <= lastDayOfMonth) {
    const dayOfWeek = currentDate.getDay();
    const dayName = dayNamesMap[dayOfWeek];
    
    if (scheduleDays.includes(dayName)) {
      classesCount++;
    }
    
    // Переходим к следующему дню
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Рассчитываем стоимость пропорционально количеству занятий
  const proportionalAmount = pricePerClass * classesCount;
  
  return Math.round(proportionalAmount * 100) / 100; // Округляем до 2 знаков
};

export const getAllStudents = async (req: Request, res: Response) => {
  const { isActive, search, groupId } = req.query;
  
  const query = studentRepository.createQueryBuilder("student")
    .leftJoinAndSelect("student.group", "group")
    .leftJoinAndSelect("student.grades", "grades")
    .leftJoinAndSelect("group.course", "course");

  // Фильтр по активности
  // Явно обрабатываем строковые значения 'true' и 'false'
  if (isActive !== undefined) {
    const isActiveStr = String(isActive);
    const isActiveBool = isActiveStr === 'true';
    query.where("student.isActive = :isActive", { isActive: isActiveBool });
  }

  // Поиск по имени, фамилии, email или телефону
  if (search) {
    query.andWhere(
      "(student.firstName ILIKE :search OR student.lastName ILIKE :search OR student.email ILIKE :search OR student.phone ILIKE :search)",
      { search: `%${search}%` }
    );
  }

  // Фильтр по группе
  if (groupId) {
    query.andWhere("student.groupId = :groupId", { groupId: parseInt(groupId as string) });
  }

  const students = await query
    .orderBy("student.createdAt", "DESC")
    .getMany();

  // Логирование для отладки
  console.log(`[getAllStudents] Запрос: isActive=${isActive}, search=${search}, groupId=${groupId}`);
  console.log(`[getAllStudents] Найдено студентов: ${students.length}`);
  if (isActive !== undefined) {
    const isActiveStr = String(isActive);
    const isActiveBool = isActiveStr === 'true';
    const inactiveCount = students.filter(s => s.isActive === false).length;
    const activeCount = students.filter(s => s.isActive === true).length;
    console.log(`[getAllStudents] Фильтр isActive=${isActiveBool}, активных: ${activeCount}, неактивных: ${inactiveCount}`);
  }

  res.json(students);
};

export const getStudentById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const student = await studentRepository.findOne({
    where: { id: parseInt(id) },
    relations: ["group", "grades"],
  });

  if (!student) {
    const error = new AppError("Student not found");
    error.statusCode = 404;
    throw error;
  }

  res.json(student);
};

export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, email: emailInput, phone, dateOfBirth, address, groupId, notes, username, password, parentName, parentPhone } = req.body;
    let email = emailInput; // Используем let для возможности изменения
    const currentUser = req.user;

    // Валидация обязательных полей - только имя и группа
    if (!firstName || firstName.trim() === '') {
      const error = new AppError("Имя обязательно для заполнения");
      error.statusCode = 400;
      throw error;
    }

    if (!groupId || groupId === 0) {
      const error = new AppError("Группа обязательна для заполнения");
      error.statusCode = 400;
      throw error;
    }

    // Проверка на существующего студента с таким email (если email указан)
    if (email) {
      const existingStudent = await studentRepository.findOne({
        where: { email },
      });

      if (existingStudent) {
        const error = new AppError("Студент с таким email уже существует");
        error.statusCode = 400;
        throw error;
      }
    }

    // Если админ указал username и password, создаем пользователя
    let userId: number | null = null;
    if (currentUser?.role === UserRole.ADMIN && username && password) {
      // Проверка на существующего пользователя с таким username
      const existingUser = await userRepository.findOne({
        where: { username },
      });

      if (existingUser) {
        const error = new AppError("Пользователь с таким логином уже существует");
        error.statusCode = 400;
        throw error;
      }

      // Валидация пароля
      if (password.length < 6) {
        const error = new AppError("Пароль должен содержать минимум 6 символов");
        error.statusCode = 400;
        throw error;
      }

      // Создаем пользователя
      const userEmail = email?.trim() || null;
      const user = userRepository.create({
        username: username.trim(),
        password: password,
        firstName: firstName.trim(),
        lastName: lastName?.trim() || '',
        email: userEmail,
        role: UserRole.STUDENT,
        isActive: true,
      });

      await user.hashPassword();
      const savedUser = await userRepository.save(user);
      userId = savedUser.id;
      
      // Если email не был указан при создании студента, но был создан пользователь,
      // создаем email на основе username для связи
      if (!email || email.trim() === '') {
        // Создаем email на основе username для связи Student с User
        email = `${username.trim()}@studycenter.local`;
        // Обновляем email в пользователе для синхронизации
        savedUser.email = email;
        await userRepository.save(savedUser);
      }
    }

    const studentData: any = {
      firstName: firstName.trim(),
      isActive: true, // Убеждаемся, что студент создается как активный
    };

    // Добавляем только непустые поля
    if (lastName && lastName.trim() !== '') {
      studentData.lastName = lastName.trim();
    }
    // Email обязателен для связи студента с пользователем, если был создан пользователь
    if (userId) {
      // Используем email из переменной (либо указанный, либо созданный на основе username)
      studentData.email = email?.trim() || `${username.trim()}@studycenter.local`;
    } else if (email && email.trim() !== '') {
      studentData.email = email.trim();
    }
    if (phone && phone.trim() !== '') {
      studentData.phone = phone.trim();
    }
    if (dateOfBirth) {
      studentData.dateOfBirth = new Date(dateOfBirth);
    }
    if (address && address.trim() !== '') {
      studentData.address = address.trim();
    }
    if (notes && notes.trim() !== '') {
      studentData.notes = notes.trim();
    }
    if (parentName && parentName.trim() !== '') {
      studentData.parentName = parentName.trim();
    }
    if (parentPhone && parentPhone.trim() !== '') {
      studentData.parentPhone = parentPhone.trim();
    }
    
    // Группа обязательна только для админа
    if (groupId && groupId > 0) {
      // Проверяем существование группы
      const group = await groupRepository.findOne({ where: { id: groupId } });
      if (!group) {
        const error = new AppError("Группа не найдена");
        error.statusCode = 404;
        throw error;
      }
      studentData.groupId = groupId;
    }

    const student = studentRepository.create(studentData);
    const savedStudent = await studentRepository.save(student);
    const studentId = Array.isArray(savedStudent) ? savedStudent[0].id : (savedStudent as any).id;
    
    // Загружаем студента с группой для возврата
    const studentWithGroup = await studentRepository.findOne({
      where: { id: studentId },
      relations: ["group", "group.course"],
    });
    
    // Автоматически создаем платеж за курс, если студент назначен на группу с курсом
    if (studentWithGroup && studentWithGroup.group && studentWithGroup.group.course) {
      const course = await courseRepository.findOne({
        where: { id: studentWithGroup.group.course.id },
      });
      
      if (course && course.price && studentWithGroup.groupId) {
        // Рассчитываем стоимость пропорционально количеству занятий в оставшиеся дни месяца
        // Цена курса - это цена за полный месяц (8 занятий)
        const studentCreatedDate = studentWithGroup.createdAt || new Date();
        const monthlyAmount = await calculateMonthlyPayment(course.price, studentCreatedDate, studentWithGroup.groupId);
        
        // Проверяем, нет ли уже платежа за текущий месяц для этого студента и курса
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0);
        
        // Форматируем месяц как YYYY-MM
        const monthString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        
        // КРИТИЧНО: Проверяем платеж строго по month (не по paymentDate!)
        // Ключ платежа: student_id + month (YYYY-MM) - БЕЗ course_id!
        // UNIQUE (student_id, month) - студент может иметь только один платёж за месяц
        const existingPayment = await paymentRepository
          .createQueryBuilder("payment")
          .where("payment.studentId = :studentId", { studentId: studentId })
          .andWhere("payment.month = :month", { month: monthString })
          .getOne();
        
        if (!existingPayment) {
          // КРИТИЧНО: Создаем НОВУЮ запись платежа
          // Платеж = ИММУТАБЕЛЬНАЯ запись после создания
          // month НИКОГДА не изменяется после создания
          const payment = paymentRepository.create({
            student: { id: studentId } as Student,
            course: { id: course.id } as Course,
            amount: monthlyAmount,
            status: PaymentStatus.PENDING,
            paymentDate: firstDayOfCurrentMonth, // Первый день месяца для единообразия
            month: monthString, // КРИТИЧНО: месяц в формате YYYY-MM - ИММУТАБЕЛЬНО!
            dueDate: lastDayOfCurrentMonth, // Последний день месяца как срок оплаты
          });
          
          try {
            await paymentRepository.save(payment);
          } catch (error: any) {
            // Обработка ошибки уникальности (если индекс еще не создан или произошла гонка)
            if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('UNIQUE constraint')) {
              console.log(`[createStudent] Платеж за месяц ${monthString} для студента ${studentId} уже существует`);
            } else {
              console.error(`[createStudent] Ошибка при создании платежа для студента ${studentId}, месяц ${monthString}:`, error.message);
            }
          }
        }
      }
    }
    
    res.status(201).json(studentWithGroup || savedStudent);
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = new AppError("Ошибка при создании студента");
    appError.statusCode = 500;
    throw appError;
  }
};

export const updateStudent = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { username, password, ...studentData } = req.body;
  const currentUser = req.user;

  const student = await studentRepository.findOne({
    where: { id: parseInt(id) },
  });

  if (!student) {
    const error = new AppError("Student not found");
    error.statusCode = 404;
    throw error;
  }

  // Если админ указал username или password, обновляем пользователя
  if (currentUser?.role === UserRole.ADMIN && (username || password)) {
    // Ищем пользователя по email студента или создаем нового
    let user = await userRepository.findOne({
      where: { email: student.email || '' },
    });

    if (!user && username) {
      // Проверяем, не существует ли пользователь с таким username
      const existingUser = await userRepository.findOne({
        where: { username },
      });

      if (existingUser) {
        const error = new AppError("Пользователь с таким логином уже существует");
        error.statusCode = 400;
        throw error;
      }

      // Создаем нового пользователя
      user = userRepository.create({
        username: username.trim(),
        password: password || 'temp123', // Временный пароль, если не указан
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        email: student.email || null,
        role: UserRole.STUDENT,
        isActive: true,
      });

      if (password) {
        await user.hashPassword();
      } else {
        // Если пароль не указан, используем временный
        await user.hashPassword();
      }
    } else if (user && username) {
      // Обновляем существующего пользователя
      // Проверяем, не занят ли новый username другим пользователем
      if (user.username !== username) {
        const existingUser = await userRepository.findOne({
          where: { username },
        });

        if (existingUser) {
          const error = new AppError("Пользователь с таким логином уже существует");
          error.statusCode = 400;
          throw error;
        }
      }

      user.username = username.trim();
      if (password && password.trim() !== '') {
        user.password = password;
        await user.hashPassword();
      }
    }

    if (user) {
      await userRepository.save(user);
    }
  }

  // Сохраняем старую группу для проверки изменения
  const oldGroupId = student.groupId;
  
  // Обновляем данные студента
  studentRepository.merge(student, studentData);
  const updatedStudent = await studentRepository.save(student);
  
  const studentWithGroup = await studentRepository.findOne({
    where: { id: parseInt(id) },
    relations: ["group", "group.course"],
  });
  
  // Если группа изменилась и новая группа имеет курс, создаем платеж
  if (studentWithGroup && studentWithGroup.group && studentWithGroup.group.course && 
      oldGroupId !== studentWithGroup.groupId) {
    const course = await courseRepository.findOne({
      where: { id: studentWithGroup.group.course.id },
    });
    
    if (course && course.price && studentWithGroup.groupId) {
      // Для существующего студента при смене группы - полная стоимость месяца
      // (так как это новый курс, а не начало месяца)
      const monthlyAmount = course.price;
      
      // Проверяем, нет ли уже платежа за текущий месяц для этого студента и курса
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
      const lastDayOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0);
      
      // Форматируем месяц как YYYY-MM
      const monthString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      
      // КРИТИЧНО: Проверяем платеж строго по month (не по paymentDate!)
      // Ключ платежа: student_id + month (YYYY-MM) - БЕЗ course_id!
      // UNIQUE (student_id, month) - студент может иметь только один платёж за месяц
      const existingPayment = await paymentRepository
        .createQueryBuilder("payment")
        .where("payment.studentId = :studentId", { studentId: parseInt(id) })
        .andWhere("payment.month = :month", { month: monthString })
        .getOne();
      
      if (!existingPayment) {
        // КРИТИЧНО: Создаем НОВУЮ запись платежа
        // Платеж = ИММУТАБЕЛЬНАЯ запись после создания
        // month НИКОГДА не изменяется после создания
        const payment = paymentRepository.create({
          student: { id: parseInt(id) } as Student,
          course: { id: course.id } as Course,
          amount: monthlyAmount,
          status: PaymentStatus.PENDING,
          paymentDate: firstDayOfCurrentMonth, // Первый день месяца для единообразия
          month: monthString, // КРИТИЧНО: месяц в формате YYYY-MM - ИММУТАБЕЛЬНО!
          dueDate: lastDayOfCurrentMonth, // Последний день месяца как срок оплаты
        });
        
        try {
          await paymentRepository.save(payment);
        } catch (error: any) {
          // Обработка ошибки уникальности (если индекс еще не создан или произошла гонка)
          if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('UNIQUE constraint')) {
            console.log(`[updateStudent] Платеж за месяц ${monthString} для студента ${id} уже существует`);
          } else {
            console.error(`[updateStudent] Ошибка при создании платежа для студента ${id}, месяц ${monthString}:`, error.message);
          }
        }
      }
    }
  }
  
  res.json(studentWithGroup || updatedStudent);
};

export const deleteStudent = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { permanent } = req.query; // Если permanent=true, то удаляем навсегда (только для админа)
  
  const student = await studentRepository.findOne({
    where: { id: parseInt(id) },
  });

  if (!student) {
    const error = new AppError("Student not found");
    error.statusCode = 404;
    throw error;
  }

  // Если permanent=true, удаляем навсегда (только для критических случаев)
  if (permanent === 'true') {
    await studentRepository.remove(student);
    res.status(204).send();
  } else {
    // Иначе помечаем как неактивного (мягкое удаление)
    student.isActive = false;
    student.dateLeft = new Date();
    await studentRepository.save(student);
    
    const updatedStudent = await studentRepository.findOne({
      where: { id: parseInt(id) },
      relations: ["group", "grades"],
    });
    
    res.json(updatedStudent);
  }
};

export const restoreStudent = async (req: Request, res: Response) => {
  const { id } = req.params;
  const student = await studentRepository.findOne({
    where: { id: parseInt(id) },
  });

  if (!student) {
    const error = new AppError("Student not found");
    error.statusCode = 404;
    throw error;
  }

  student.isActive = true;
  student.dateLeft = null;
  await studentRepository.save(student);
  
  const updatedStudent = await studentRepository.findOne({
    where: { id: parseInt(id) },
    relations: ["group", "grades"],
  });
  
  res.json(updatedStudent);
};

// Получить студента по email (для студентов)
export const getStudentByEmail = async (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    const error = new AppError("Пользователь не найден");
    error.statusCode = 401;
    throw error;
  }

  // Ищем студента по email, если он есть
  const whereCondition: any = {};
  if (user.email) {
    whereCondition.email = user.email;
  } else {
    // Если email нет, ищем по firstName и lastName
    whereCondition.firstName = user.firstName;
    if (user.lastName) {
      whereCondition.lastName = user.lastName;
    }
  }
  
  const student = await studentRepository.findOne({
    where: whereCondition,
    relations: ["group", "group.course"],
  });

  if (!student) {
    // Если студент не найден, возвращаем null (студент еще не записан ни на один курс)
    return res.json(null);
  }

  res.json(student);
};

// Записаться на курс (добавить студента в группу)
export const enrollInCourse = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { groupId } = req.body;

  if (!user) {
    const error = new AppError("Пользователь не найден");
    error.statusCode = 401;
    throw error;
  }

  if (!groupId) {
    const error = new AppError("ID группы обязателен");
    error.statusCode = 400;
    throw error;
  }

  // Проверяем, существует ли группа
  const group = await groupRepository.findOne({
    where: { id: groupId },
    relations: ["course", "students"],
  });

  if (!group) {
    const error = new AppError("Группа не найдена");
    error.statusCode = 404;
    throw error;
  }

  // Проверяем, не переполнена ли группа
  if (group.students && group.students.length >= group.maxStudents) {
    const error = new AppError("Группа переполнена");
    error.statusCode = 400;
    throw error;
  }

  // Ищем или создаем студента
  const whereCondition: any = {};
  if (user.email) {
    whereCondition.email = user.email;
  } else {
    // Если email нет, ищем по firstName и lastName
    whereCondition.firstName = user.firstName;
    if (user.lastName) {
      whereCondition.lastName = user.lastName;
    }
  }
  
  let student = await studentRepository.findOne({
    where: whereCondition,
  });

  if (!student) {
    // Создаем нового студента на основе данных пользователя
    const studentData: any = {
      firstName: user.firstName,
      isActive: true,
      groupId: groupId,
    };
    
    if (user.lastName) {
      studentData.lastName = user.lastName;
    }
    if (user.email) {
      studentData.email = user.email;
    }
    
    const newStudent = studentRepository.create(studentData);
    const savedNewStudent = await studentRepository.save(newStudent);
    student = (Array.isArray(savedNewStudent) ? savedNewStudent[0] : savedNewStudent) as Student;
  } else {
    // Обновляем группу студента
    student.groupId = groupId;
    student.isActive = true;
    student = await studentRepository.save(student);
  }

  if (!student) {
    const error = new AppError("Ошибка при создании/обновлении студента");
    error.statusCode = 500;
    throw error;
  }

  const studentWithRelations = await studentRepository.findOne({
    where: { id: student.id },
    relations: ["group", "group.course"],
  });

  // Автоматически создаем платеж за курс, если студент записан на группу с курсом
  if (studentWithRelations && studentWithRelations.group && studentWithRelations.group.course) {
    const course = await courseRepository.findOne({
      where: { id: studentWithRelations.group.course.id },
    });
    
    if (course && course.price && studentWithRelations.groupId) {
      // При записи на курс - рассчитываем пропорционально количеству занятий в оставшиеся дни месяца
      const studentCreatedDate = student.createdAt || new Date();
      const monthlyAmount = await calculateMonthlyPayment(course.price, studentCreatedDate, studentWithRelations.groupId);
      
      // Проверяем, нет ли уже платежа за текущий месяц для этого студента и курса
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
      const lastDayOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0);
      
      // Форматируем месяц как YYYY-MM
      const monthString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      
      // КРИТИЧНО: Проверяем платеж строго по month (не по paymentDate!)
      // Ключ платежа: student_id + month (YYYY-MM) - БЕЗ course_id!
      // UNIQUE (student_id, month) - студент может иметь только один платёж за месяц
      const existingPayment = await paymentRepository
        .createQueryBuilder("payment")
        .where("payment.studentId = :studentId", { studentId: student.id })
        .andWhere("payment.month = :month", { month: monthString })
        .getOne();
      
      if (!existingPayment) {
        // КРИТИЧНО: Создаем НОВУЮ запись платежа
        // Платеж = ИММУТАБЕЛЬНАЯ запись после создания
        // month НИКОГДА не изменяется после создания
        const payment = paymentRepository.create({
          student: { id: student.id } as Student,
          course: { id: course.id } as Course,
          amount: monthlyAmount,
          status: PaymentStatus.PENDING,
          paymentDate: firstDayOfCurrentMonth, // Первый день месяца для единообразия
          month: monthString, // КРИТИЧНО: месяц в формате YYYY-MM - ИММУТАБЕЛЬНО!
          dueDate: lastDayOfCurrentMonth, // Последний день месяца как срок оплаты
        });
        
        try {
          await paymentRepository.save(payment);
        } catch (error: any) {
          // Обработка ошибки уникальности (если индекс еще не создан или произошла гонка)
          if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('UNIQUE constraint')) {
            console.log(`[enrollInCourse] Платеж за месяц ${monthString} для студента ${student.id} уже существует`);
          } else {
            console.error(`[enrollInCourse] Ошибка при создании платежа для студента ${student.id}, месяц ${monthString}:`, error.message);
          }
        }
      }
    }
  }

  res.status(201).json(studentWithRelations);
};

