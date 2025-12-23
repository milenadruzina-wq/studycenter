import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { Course } from "../entities/Course";
import { Group } from "../entities/Group";
import { Schedule } from "../entities/Schedule";
import { Attendance } from "../entities/Attendance";
import { Payment } from "../entities/Payment";
import { Student } from "../entities/Student";

async function deleteAllCourses() {
  try {
    console.log("🔄 Подключение к базе данных...");
    await AppDataSource.initialize();
    console.log("✅ База данных подключена!");

    const courseRepository = AppDataSource.getRepository(Course);
    const groupRepository = AppDataSource.getRepository(Group);
    const scheduleRepository = AppDataSource.getRepository(Schedule);
    const attendanceRepository = AppDataSource.getRepository(Attendance);
    const paymentRepository = AppDataSource.getRepository(Payment);
    const studentRepository = AppDataSource.getRepository(Student);

    // Получаем все курсы
    const courses = await courseRepository.find({
      relations: ["groups", "groups.students", "groups.schedules", "groups.attendances", "payments"],
    });

    console.log(`📚 Найдено курсов: ${courses.length}`);

    if (courses.length === 0) {
      console.log("ℹ️  Курсы не найдены. База данных уже пуста.");
      await AppDataSource.destroy();
      process.exit(0);
    }

    // Удаляем связанные данные
    for (const course of courses) {
      console.log(`\n🗑️  Удаление курса: ${course.name} (ID: ${course.id})`);

      // Удаляем группы и связанные данные
      if (course.groups && course.groups.length > 0) {
        for (const group of course.groups) {
          console.log(`   - Удаление группы: ${group.name} (ID: ${group.id})`);

          // Удаляем расписания группы
          if (group.schedules) {
            const scheduleIds = group.schedules.map(s => s.id);
            if (scheduleIds.length > 0) {
              await scheduleRepository.delete(scheduleIds);
              console.log(`     ✓ Удалено расписаний: ${scheduleIds.length}`);
            }
          }

          // Удаляем посещаемость группы
          if (group.attendances) {
            const attendanceIds = group.attendances.map(a => a.id);
            if (attendanceIds.length > 0) {
              await attendanceRepository.delete(attendanceIds);
              console.log(`     ✓ Удалено записей посещаемости: ${attendanceIds.length}`);
            }
          }

          // Отвязываем студентов от группы (не удаляем студентов, только убираем группу)
          if (group.students) {
            for (const student of group.students) {
              student.groupId = null;
              await studentRepository.save(student);
            }
            console.log(`     ✓ Отвязано студентов от группы: ${group.students.length}`);
          }

          // Удаляем группу
          await groupRepository.delete(group.id);
          console.log(`     ✓ Группа удалена`);
        }
      }

      // Удаляем платежи курса
      if (course.payments && course.payments.length > 0) {
        const paymentIds = course.payments.map(p => p.id);
        await paymentRepository.delete(paymentIds);
        console.log(`   ✓ Удалено платежей: ${paymentIds.length}`);
      }

      // Удаляем курс
      await courseRepository.delete(course.id);
      console.log(`   ✓ Курс удален`);
    }

    console.log(`\n✅ Все курсы успешно удалены!`);
    console.log(`   Всего удалено: ${courses.length} курсов`);

    await AppDataSource.destroy();
    console.log("🔌 Соединение закрыто.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Ошибка:", error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

deleteAllCourses();











