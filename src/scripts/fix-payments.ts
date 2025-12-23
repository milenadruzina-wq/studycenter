import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { Payment, PaymentStatus } from "../entities/Payment";
import { Student } from "../entities/Student";

async function fixPayments() {
  try {
    console.log("🔄 Подключение к базе данных...");
    await AppDataSource.initialize();
    console.log("✅ База данных подключена!");

    const paymentRepository = AppDataSource.getRepository(Payment);
    const studentRepository = AppDataSource.getRepository(Student);

    // Получаем текущий месяц
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0);

    console.log(`\n📅 Текущий месяц: ${firstDayOfCurrentMonth.toISOString().split('T')[0]}`);

    // Получаем все платежи
    const allPayments = await paymentRepository.find({
      relations: ["student", "course"],
      order: { paymentDate: "ASC" },
    });

    console.log(`\n📊 Всего платежей в базе: ${allPayments.length}`);

    // Группируем платежи по студенту, курсу и месяцу
    const paymentsByStudentCourseMonth = new Map<string, Payment[]>();

    for (const payment of allPayments) {
      if (!payment.student || !payment.course) {
        continue;
      }

      // Определяем месяц платежа
      // paymentDate может быть строкой или Date объектом
      const paymentDate = payment.paymentDate instanceof Date 
        ? payment.paymentDate 
        : new Date(payment.paymentDate);
      const paymentYear = paymentDate.getFullYear();
      const paymentMonth = paymentDate.getMonth();
      const firstDayOfPaymentMonth = new Date(paymentYear, paymentMonth, 1);

      const key = `${payment.studentId}_${payment.courseId}_${paymentYear}_${paymentMonth}`;
      
      if (!paymentsByStudentCourseMonth.has(key)) {
        paymentsByStudentCourseMonth.set(key, []);
      }
      paymentsByStudentCourseMonth.get(key)!.push(payment);
    }

    console.log(`\n📦 Уникальных комбинаций (студент + курс + месяц): ${paymentsByStudentCourseMonth.size}`);

    let deletedCount = 0;
    let fixedCount = 0;
    const paymentsToDelete: number[] = [];
    const paymentsToUpdate: Payment[] = [];

    // Обрабатываем каждую группу
    for (const [key, payments] of paymentsByStudentCourseMonth.entries()) {
      if (payments.length === 0) continue;

      const [studentId, courseId, year, month] = key.split("_").map(Number);
      const paymentMonth = new Date(year, month, 1);

      // Определяем, является ли это текущим месяцем
      const isCurrentMonth = paymentMonth.getTime() === firstDayOfCurrentMonth.getTime();
      const isFutureMonth = paymentMonth > firstDayOfCurrentMonth;

      // Удаляем все платежи за будущие месяцы
      if (isFutureMonth) {
        console.log(`\n🗑️  Удаление платежей за будущий месяц: ${paymentMonth.toISOString().split('T')[0]}`);
        for (const payment of payments) {
          paymentsToDelete.push(payment.id);
          deletedCount++;
          console.log(`   ✓ Удален платеж ID ${payment.id} (студент ${payment.studentId}, курс ${payment.courseId})`);
        }
        continue;
      }

      // Для текущего и прошлых месяцев оставляем только один платеж
      if (payments.length > 1) {
        console.log(`\n⚠️  Найдено ${payments.length} платежей для студента ${studentId}, курс ${courseId}, месяц ${paymentMonth.toISOString().split('T')[0]}`);

        // Сортируем платежи: сначала оплаченные, потом по дате создания
        payments.sort((a, b) => {
          if (a.status === PaymentStatus.PAID && b.status !== PaymentStatus.PAID) return -1;
          if (a.status !== PaymentStatus.PAID && b.status === PaymentStatus.PAID) return 1;
          return a.id - b.id; // Старший ID (более новый) в конце
        });

        // Оставляем первый платеж (самый старый или оплаченный), остальные удаляем
        const paymentToKeep = payments[0];
        const paymentsToRemove = payments.slice(1);

        console.log(`   ✓ Оставляем платеж ID ${paymentToKeep.id} (статус: ${paymentToKeep.status})`);

        // Исправляем дату оставляемого платежа на первый день месяца
        const keepPaymentDate = paymentToKeep.paymentDate instanceof Date 
          ? paymentToKeep.paymentDate 
          : new Date(paymentToKeep.paymentDate);
        if (keepPaymentDate.getTime() !== paymentMonth.getTime()) {
          paymentToKeep.paymentDate = paymentMonth;
          paymentsToUpdate.push(paymentToKeep);
          fixedCount++;
          console.log(`   ✓ Исправлена дата платежа ID ${paymentToKeep.id} на ${paymentMonth.toISOString().split('T')[0]}`);
        }

        // Удаляем дубликаты
        for (const payment of paymentsToRemove) {
          paymentsToDelete.push(payment.id);
          deletedCount++;
          console.log(`   ✓ Удален дубликат платежа ID ${payment.id}`);
        }
      } else {
        // Если платеж один, но дата неправильная - исправляем
        const payment = payments[0];
        const paymentDate = payment.paymentDate instanceof Date 
          ? payment.paymentDate 
          : new Date(payment.paymentDate);
        const expectedDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), 1);

        if (paymentDate.getTime() !== expectedDate.getTime()) {
          payment.paymentDate = expectedDate;
          paymentsToUpdate.push(payment);
          fixedCount++;
          console.log(`   ✓ Исправлена дата платежа ID ${payment.id} на ${expectedDate.toISOString().split('T')[0]}`);
        }
      }
    }

    // Удаляем платежи
    if (paymentsToDelete.length > 0) {
      console.log(`\n🗑️  Удаление ${paymentsToDelete.length} платежей...`);
      await paymentRepository.delete(paymentsToDelete);
      console.log(`✅ Удалено платежей: ${paymentsToDelete.length}`);
    }

    // Обновляем платежи с исправленными датами
    if (paymentsToUpdate.length > 0) {
      console.log(`\n✏️  Обновление ${paymentsToUpdate.length} платежей...`);
      await paymentRepository.save(paymentsToUpdate);
      console.log(`✅ Обновлено платежей: ${paymentsToUpdate.length}`);
    }

    // Статистика после исправления
    const remainingPayments = await paymentRepository.count();
    const currentMonthPayments = await paymentRepository
      .createQueryBuilder("payment")
      .where("payment.paymentDate >= :startDate", { startDate: firstDayOfCurrentMonth })
      .andWhere("payment.paymentDate <= :endDate", { endDate: lastDayOfCurrentMonth })
      .getCount();

    console.log(`\n📊 Статистика после исправления:`);
    console.log(`   Всего платежей: ${remainingPayments}`);
    console.log(`   Платежей за текущий месяц: ${currentMonthPayments}`);
    console.log(`   Удалено: ${deletedCount}`);
    console.log(`   Исправлено: ${fixedCount}`);

    await AppDataSource.destroy();
    console.log("\n✅ Исправление завершено!");
    console.log("🔌 Соединение закрыто.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Ошибка:", error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

fixPayments();







