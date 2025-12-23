import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Payment, PaymentStatus } from "../entities/Payment";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth.middleware";
import { UserRole } from "../entities/User";
import { Student } from "../entities/Student";

const paymentRepository = AppDataSource.getRepository(Payment);
const studentRepository = AppDataSource.getRepository(Student);

// Вспомогательная функция для форматирования месяца в YYYY-MM
const formatMonthString = (year: number, month: number): string => {
  // month должен быть в формате 1-12 (не 0-11!)
  return `${year}-${String(month).padStart(2, '0')}`;
};

// Вспомогательная функция для получения месяца из строки YYYY-MM
const parseMonthString = (monthString: string): { year: number; month: number } => {
  const [year, month] = monthString.split('-').map(Number);
  return { year, month }; // month уже в формате 1-12
};

export const getAllPayments = async (req: AuthRequest, res: Response) => {
  // КРИТИЧНО: Принимаем month напрямую в формате YYYY-MM (например, "2026-02")
  // Это строка, НЕ дата, НЕ число!
  const { studentId, courseId, status, month } = req.query;
  const user = req.user;

  // КРИТИЧНО: month должен быть в формате YYYY-MM
  // Если month не указан или неверного формата - возвращаем ошибку
  let targetMonthString: string | null = null;
  
  if (month && typeof month === 'string') {
    // Проверяем формат YYYY-MM
    const monthRegex = /^\d{4}-\d{2}$/;
    if (monthRegex.test(month)) {
      targetMonthString = month; // Используем напрямую, БЕЗ преобразований!
    } else {
      const error = new AppError("Неверный формат месяца. Ожидается YYYY-MM (например, 2026-02)");
      error.statusCode = 400;
      throw error;
    }
  } else {
    // Если month не указан, возвращаем ошибку
    const error = new AppError("Параметр month обязателен (формат: YYYY-MM)");
    error.statusCode = 400;
    throw error;
  }

  // КРИТИЧНО: Создаем платежи для ВСЕХ активных студентов за выбранный месяц
  // Если платеж отсутствует - создаем автоматически (статус = unpaid, сумма = цена курса)
  // Это должно происходить ДО загрузки данных
  console.log(`[getAllPayments] Обеспечение платежей за месяц: ${targetMonthString}`);
  await ensureMonthlyPayments(targetMonthString);

  // Теперь загружаем платежи с учетом всех фильтров
  // КРИТИЧНО: Фильтруем СТРОГО по month (ключ: student_id + month)
  const query = paymentRepository.createQueryBuilder("payment")
    .leftJoinAndSelect("payment.student", "student")
    .leftJoinAndSelect("payment.course", "course")
    .leftJoinAndSelect("student.group", "group")
    .where("payment.month = :month", { month: targetMonthString }); // ОБЯЗАТЕЛЬНЫЙ фильтр по месяцу

  // Если пользователь - студент, показываем только его платежи
  if (user?.role === UserRole.STUDENT) {
    const userEmail = user.email;
    if (userEmail) {
      const student = await studentRepository.findOne({
        where: { email: userEmail },
      });
      if (student) {
        query.andWhere("payment.studentId = :studentId", { studentId: student.id });
      } else {
        return res.json([]);
      }
    } else {
      return res.json([]);
    }
  } else if (studentId) {
    query.andWhere("payment.studentId = :studentId", { studentId: parseInt(studentId as string) });
  }

  if (courseId) {
    query.andWhere("payment.courseId = :courseId", { courseId: parseInt(courseId as string) });
  }

  if (status) {
    query.andWhere("payment.status = :status", { status });
  }

  // ЗАПРЕЩЕНО: использовать фильтры по paymentDate, когда указан month
  // Все фильтры должны быть строго по month

  const payments = await query
    .orderBy("student.lastName", "ASC")
    .addOrderBy("student.firstName", "ASC")
    .getMany();

  res.json(payments);
};

// Функция для создания платежей за указанный месяц для всех активных студентов
// КРИТИЧНО: Ключ платежа = student_id + month (YYYY-MM)
// Если платеж за месяц отсутствует - создает автоматически:
//   - status = PENDING (unpaid)
//   - amount = цена курса
//   - month = monthString (YYYY-MM)
//   - payment_date = null (так как еще не оплачен)
// КРИТИЧНО: Каждый месяц независим, долги не суммируются между месяцами
// Принимает monthString в формате YYYY-MM (например, "2026-01") - СТРОКА, НЕ ДАТА!
const ensureMonthlyPayments = async (monthString: string) => {
  // КРИТИЧНО: monthString уже в формате YYYY-MM, используем напрямую
  // Для вычисления дат (paymentDate, dueDate) используем локальное время
  // НО это только для полей дат, НЕ для логики месяца!
  const { year: targetYear, month: targetMonth } = parseMonthString(monthString);
  
  // Для вычисления дат используем локальное время (НЕ UTC!)
  // targetMonth в формате 1-12, для Date нужен 0-11
  const firstDayOfMonth = new Date(targetYear, targetMonth - 1, 1);
  const lastDayOfMonth = new Date(targetYear, targetMonth, 0);

  console.log(`[ensureMonthlyPayments] Обеспечение платежей за месяц ${monthString}`);

  // Получаем всех активных студентов с группами и курсами
  const activeStudents = await studentRepository.find({
    where: { isActive: true },
    relations: ["group", "group.course"],
    order: { lastName: "ASC", firstName: "ASC" },
  });

  console.log(`[ensureMonthlyPayments] Найдено активных студентов: ${activeStudents.length}`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const student of activeStudents) {
    // Пропускаем студентов без группы или курса
    if (!student.group || !student.group.course) {
      console.log(`[ensureMonthlyPayments] Пропуск студента ${student.id}: нет группы или курса`);
      skippedCount++;
      continue;
    }

    // Пропускаем студентов, у которых курс не имеет цены
    if (!student.group.course.price || student.group.course.price <= 0) {
      console.log(`[ensureMonthlyPayments] Пропуск студента ${student.id}: курс не имеет цены`);
      skippedCount++;
      continue;
    }

    // КРИТИЧНО: Проверяем платеж строго по month (не по paymentDate!)
    // Это гарантирует, что каждый месяц независим
    // Ключ платежа: student_id + month (YYYY-MM) - БЕЗ course_id!
    // UNIQUE (student_id, month) - студент может иметь только один платёж за месяц
    const existingPayment = await paymentRepository
      .createQueryBuilder("payment")
      .where("payment.studentId = :studentId", { studentId: student.id })
      .andWhere("payment.month = :month", { month: monthString })
      .getOne();

    // КРИТИЧНО: Если платежа за этот месяц нет - создаем НОВУЮ запись
    // НИКОГДА не обновляем существующие платежи других месяцев!
    // Платеж = ИММУТАБЕЛЬНАЯ запись после создания
    if (!existingPayment) {
      let amount = student.group.course.price; // Полная стоимость месяца

      // КРИТИЧНО: Создаем НОВУЮ запись платежа
      // Платеж = ИММУТАБЕЛЬНАЯ запись после создания
      // month НИКОГДА не изменяется после создания
      const payment = paymentRepository.create({
        student: { id: student.id } as any,
        course: { id: student.group.course.id } as any,
        amount: amount,
        status: PaymentStatus.PENDING, // По умолчанию долг (unpaid)
        paymentDate: firstDayOfMonth, // Дата начала месяца (для отображения)
        month: monthString, // КРИТИЧНО: месяц в формате YYYY-MM - ОСНОВНОЙ идентификатор (ключ), ИММУТАБЕЛЬНО!
        dueDate: lastDayOfMonth, // Дата окончания месяца как срок оплаты
      });

      try {
        await paymentRepository.save(payment);
        createdCount++;
        console.log(
          `[ensureMonthlyPayments] Создан долг для студента ${student.id}: ${student.firstName} ${student.lastName || ""}, сумма: ${amount}, месяц: ${monthString}`
        );
      } catch (error: any) {
        // Обработка ошибки уникальности (если индекс еще не создан или произошла гонка)
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('UNIQUE constraint')) {
          console.log(
            `[ensureMonthlyPayments] Платеж для студента ${student.id} за месяц ${monthString} уже существует (возможно, создан параллельно)`
          );
        } else {
          console.error(
            `[ensureMonthlyPayments] Ошибка при создании платежа для студента ${student.id}, месяц ${monthString}:`,
            error.message
          );
        }
      }
    } else {
      console.log(
        `[ensureMonthlyPayments] Платеж для студента ${student.id} уже существует за месяц ${monthString} (статус: ${existingPayment.status})`
      );
    }
  }

  console.log(
    `[ensureMonthlyPayments] Завершено. Создано: ${createdCount}, пропущено: ${skippedCount}, всего студентов: ${activeStudents.length}`
  );
};

export const getPaymentById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const payment = await paymentRepository.findOne({
    where: { id: parseInt(id) },
    relations: ["student", "course"],
  });

  if (!payment) {
    const error = new AppError("Платеж не найден");
    error.statusCode = 404;
    throw error;
  }

  res.json(payment);
};

export const createPayment = async (req: Request, res: Response) => {
  const paymentData = req.body;
  
  // КРИТИЧНО: Проверяем, что month указан и в правильном формате
  if (!paymentData.month || typeof paymentData.month !== 'string') {
    const error = new AppError("Поле month обязательно и должно быть в формате YYYY-MM");
    error.statusCode = 400;
    throw error;
  }
  
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(paymentData.month)) {
    const error = new AppError("Неверный формат month. Ожидается YYYY-MM (например, 2026-02)");
    error.statusCode = 400;
    throw error;
  }
  
  // КРИТИЧНО: Проверяем уникальность (student_id + month)
  // Если платеж за этот месяц уже существует - возвращаем ошибку
  const existingPayment = await paymentRepository
    .createQueryBuilder("payment")
    .where("payment.studentId = :studentId", { studentId: paymentData.studentId })
    .andWhere("payment.month = :month", { month: paymentData.month })
    .getOne();
  
  if (existingPayment) {
    const error = new AppError(`Платеж за месяц ${paymentData.month} для этого студента уже существует`);
    error.statusCode = 409; // Conflict
    throw error;
  }
  
  // КРИТИЧНО: Преобразуем пустые строки в null для полей типа date
  // PostgreSQL не может обработать пустую строку как дату
  if (paymentData.dueDate === '' || paymentData.dueDate === null || paymentData.dueDate === undefined) {
    paymentData.dueDate = null;
  } else if (typeof paymentData.dueDate === 'string' && paymentData.dueDate.trim() === '') {
    paymentData.dueDate = null;
  }

  // paymentDate обязателен, поэтому если он пустой - используем первый день месяца
  if (!paymentData.paymentDate || paymentData.paymentDate === '' || 
      (typeof paymentData.paymentDate === 'string' && paymentData.paymentDate.trim() === '')) {
    // Извлекаем год и месяц из month (формат YYYY-MM)
    const [year, month] = paymentData.month.split('-').map(Number);
    paymentData.paymentDate = new Date(year, month - 1, 1); // Первый день месяца
  }

  // Преобразуем пустые строки в null для текстовых полей
  if (paymentData.notes === '') {
    paymentData.notes = null;
  }
  if (paymentData.paymentMethod === '') {
    paymentData.paymentMethod = null;
  }
  
  const payment = paymentRepository.create(paymentData);
  const savedPayment = await paymentRepository.save(payment);
  const paymentId = Array.isArray(savedPayment) ? savedPayment[0].id : (savedPayment as any).id;
  
  const paymentWithRelations = await paymentRepository.findOne({
    where: { id: paymentId },
    relations: ["student", "course"],
  });

  res.status(201).json(paymentWithRelations);
};

export const updatePayment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const payment = await paymentRepository.findOne({
    where: { id: parseInt(id) },
  });

  if (!payment) {
    const error = new AppError("Платеж не найден");
    error.statusCode = 404;
    throw error;
  }

  // КРИТИЧНО: Запрещаем изменение поля month - это ИММУТАБЕЛЬНОЕ поле!
  // month определяет, за какой месяц платеж, и НИКОГДА не должен изменяться
  const updateData = { ...req.body };
  if (updateData.month && updateData.month !== payment.month) {
    const error = new AppError("Поле month нельзя изменять. Платеж привязан к конкретному месяцу.");
    error.statusCode = 400;
    throw error;
  }
  
  // Удаляем month из данных обновления, даже если он был передан
  delete updateData.month;

  // КРИТИЧНО: Преобразуем пустые строки в null для полей типа date
  // PostgreSQL не может обработать пустую строку как дату
  if (updateData.dueDate === '' || updateData.dueDate === null || updateData.dueDate === undefined) {
    updateData.dueDate = null;
  } else if (typeof updateData.dueDate === 'string' && updateData.dueDate.trim() === '') {
    updateData.dueDate = null;
  }

  if (updateData.paymentDate === '' || updateData.paymentDate === null || updateData.paymentDate === undefined) {
    // paymentDate не может быть null (не nullable), поэтому оставляем текущее значение
    delete updateData.paymentDate;
  } else if (typeof updateData.paymentDate === 'string' && updateData.paymentDate.trim() === '') {
    // paymentDate не может быть пустым, оставляем текущее значение
    delete updateData.paymentDate;
  }

  // Преобразуем пустые строки в null для текстовых полей (опционально)
  if (updateData.notes === '') {
    updateData.notes = null;
  }
  if (updateData.paymentMethod === '') {
    updateData.paymentMethod = null;
  }

  paymentRepository.merge(payment, updateData);
  const updatedPayment = await paymentRepository.save(payment);
  
  const paymentWithRelations = await paymentRepository.findOne({
    where: { id: updatedPayment.id },
    relations: ["student", "course"],
  });

  res.json(paymentWithRelations);
};

export const deletePayment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await paymentRepository.delete(id);

  if (result.affected === 0) {
    const error = new AppError("Платеж не найден");
    error.statusCode = 404;
    throw error;
  }

  res.status(204).send();
};

export const markAsPaid = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { paymentMethod, notes } = req.body;
  
  const payment = await paymentRepository.findOne({
    where: { id: parseInt(id) },
  });

  if (!payment) {
    const error = new AppError("Платеж не найден");
    error.statusCode = 404;
    throw error;
  }

  payment.status = PaymentStatus.PAID;
  payment.paymentDate = new Date();
  if (paymentMethod) {
    payment.paymentMethod = paymentMethod;
  }
  if (notes) {
    payment.notes = notes;
  }

  const updatedPayment = await paymentRepository.save(payment);
  
  const paymentWithRelations = await paymentRepository.findOne({
    where: { id: updatedPayment.id },
    relations: ["student", "course"],
  });

  res.json(paymentWithRelations);
};

// Получить платежи за конкретный месяц
export const getPaymentsByMonth = async (req: AuthRequest, res: Response) => {
  // КРИТИЧНО: Принимаем month напрямую в формате YYYY-MM (например, "2026-02")
  // Это строка, НЕ дата, НЕ число!
  const { month } = req.params;
  const { studentId, courseId, status } = req.query;
  const user = req.user;

  if (!month || typeof month !== 'string') {
    const error = new AppError("Параметр month обязателен (формат: YYYY-MM)");
    error.statusCode = 400;
    throw error;
  }

  // Проверяем формат YYYY-MM
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(month)) {
    const error = new AppError("Неверный формат месяца. Ожидается YYYY-MM (например, 2026-02)");
    error.statusCode = 400;
    throw error;
  }

  const monthString = month; // Используем напрямую, БЕЗ преобразований!

  // КРИТИЧНО: Создаем платежи для ВСЕХ активных студентов за выбранный месяц
  // Если платеж отсутствует - создаем автоматически (статус = unpaid, сумма = цена курса)
  // Это должно происходить ДО загрузки данных
  console.log(`[getPaymentsByMonth] Обеспечение платежей за месяц: ${monthString}`);
  await ensureMonthlyPayments(monthString);

  // КРИТИЧНО: Загружаем платежи строго по month (не по paymentDate!)
  // Это гарантирует, что показываются ТОЛЬКО платежи выбранного месяца
  const query = paymentRepository.createQueryBuilder("payment")
    .leftJoinAndSelect("payment.student", "student")
    .leftJoinAndSelect("payment.course", "course")
    .leftJoinAndSelect("student.group", "group")
    .where("payment.month = :month", { month: monthString });

  // Если пользователь - студент, показываем только его платежи
  if (user?.role === UserRole.STUDENT) {
    const userEmail = user.email;
    if (userEmail) {
      const student = await studentRepository.findOne({
        where: { email: userEmail },
      });
      if (student) {
        query.andWhere("payment.studentId = :studentId", { studentId: student.id });
      } else {
        return res.json([]);
      }
    } else {
      return res.json([]);
    }
  } else if (studentId) {
    query.andWhere("payment.studentId = :studentId", { studentId: parseInt(studentId as string) });
  }

  if (courseId) {
    query.andWhere("payment.courseId = :courseId", { courseId: parseInt(courseId as string) });
  }

  if (status) {
    query.andWhere("payment.status = :status", { status });
  }

  const payments = await query
    .orderBy("student.lastName", "ASC")
    .addOrderBy("student.firstName", "ASC")
    .getMany();

  res.json(payments);
};

export const getPaymentStats = async (req: Request, res: Response) => {
  // КРИТИЧНО: Параметр month ОБЯЗАТЕЛЕН для статистики
  // Статистика считается ТОЛЬКО по выбранному месяцу
  const { studentId, courseId, month } = req.query;

  // КРИТИЧНО: month должен быть в формате YYYY-MM
  // Если month не указан или неверного формата - возвращаем ошибку
  let targetMonthString: string | null = null;
  
  if (month && typeof month === 'string') {
    // Проверяем формат YYYY-MM
    const monthRegex = /^\d{4}-\d{2}$/;
    if (monthRegex.test(month)) {
      targetMonthString = month; // Используем напрямую, БЕЗ преобразований!
    } else {
      const error = new AppError("Неверный формат месяца. Ожидается YYYY-MM (например, 2026-02)");
      error.statusCode = 400;
      throw error;
    }
  } else {
    // Если month не указан, возвращаем ошибку
    const error = new AppError("Параметр month обязателен для статистики (формат: YYYY-MM)");
    error.statusCode = 400;
    throw error;
  }

  // КРИТИЧНО: Фильтруем СТРОГО по month (не по paymentDate!)
  // Все агрегации считаются ТОЛЬКО по выбранному месяцу
  const query = paymentRepository.createQueryBuilder("payment")
    .where("payment.month = :month", { month: targetMonthString }); // ОБЯЗАТЕЛЬНЫЙ фильтр по месяцу

  if (studentId) {
    query.andWhere("payment.studentId = :studentId", { studentId: parseInt(studentId as string) });
  }

  if (courseId) {
    query.andWhere("payment.courseId = :courseId", { courseId: parseInt(courseId as string) });
  }

  // ЗАПРЕЩЕНО: использовать фильтры по paymentDate, когда указан month
  // Все фильтры должны быть строго по month

  const payments = await query.getMany();

  const stats = {
    total: payments.length,
    totalAmount: payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
    paid: payments.filter(p => p.status === PaymentStatus.PAID).length,
    paidAmount: payments
      .filter(p => p.status === PaymentStatus.PAID)
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
    pending: payments.filter(p => p.status === PaymentStatus.PENDING).length,
    pendingAmount: payments
      .filter(p => p.status === PaymentStatus.PENDING)
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
    overdue: payments.filter(p => p.status === PaymentStatus.OVERDUE).length,
    overdueAmount: payments
      .filter(p => p.status === PaymentStatus.OVERDUE)
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
  };

  res.json(stats);
};


