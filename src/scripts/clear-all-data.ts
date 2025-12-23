import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { User, UserRole } from "../entities/User";
import { Teacher } from "../entities/Teacher";
import { Student } from "../entities/Student";
import { Course } from "../entities/Course";
import { Group } from "../entities/Group";
import { Schedule } from "../entities/Schedule";
import { Grade } from "../entities/Grade";
import { Attendance } from "../entities/Attendance";
import { Payment } from "../entities/Payment";
import { Branch } from "../entities/Branch";
import { CourseRequest } from "../entities/CourseRequest";

async function clearAllData() {
  try {
    console.log("🔄 Подключение к базе данных...");
    await AppDataSource.initialize();
    console.log("✅ База данных подключена!");

    // Сохраняем данные администратора
    const userRepository = AppDataSource.getRepository(User);
    const admin = await userRepository.findOne({
      where: { username: "admin", role: UserRole.ADMIN },
    });

    let adminData: any = null;
    if (admin) {
      adminData = {
        username: admin.username,
        password: admin.password, // Сохраняем хеш пароля
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        isActive: admin.isActive,
      };
      console.log("✅ Данные администратора сохранены");
      console.log(`   Username: ${adminData.username}`);
    } else {
      console.log("⚠️  Администратор не найден, будет создан новый");
      adminData = {
        username: "admin",
        password: "admin201075", // Пароль для хеширования
        email: "admin@studycenter.ru",
        firstName: "Администратор",
        lastName: "Системы",
        role: UserRole.ADMIN,
        isActive: true,
      };
    }

    console.log("\n🗑️  Начинаем очистку базы данных...\n");

    // Используем QueryRunner для эффективного удаления всех данных
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Получаем количество записей перед удалением
      const attendancesCount = await queryRunner.query('SELECT COUNT(*) as count FROM attendances');
      const paymentsCount = await queryRunner.query('SELECT COUNT(*) as count FROM payments');
      const gradesCount = await queryRunner.query('SELECT COUNT(*) as count FROM grades');
      const schedulesCount = await queryRunner.query('SELECT COUNT(*) as count FROM schedules');
      const courseRequestsCount = await queryRunner.query('SELECT COUNT(*) as count FROM course_requests');
      const groupsCount = await queryRunner.query('SELECT COUNT(*) as count FROM groups');
      const studentsCount = await queryRunner.query('SELECT COUNT(*) as count FROM students');
      const coursesCount = await queryRunner.query('SELECT COUNT(*) as count FROM courses');
      const teachersCount = await queryRunner.query('SELECT COUNT(*) as count FROM teachers');
      const branchesCount = await queryRunner.query('SELECT COUNT(*) as count FROM branches');
      const usersCount = await queryRunner.query('SELECT COUNT(*) as count FROM users');

      // Отключаем проверку внешних ключей временно
      await queryRunner.query('SET session_replication_role = replica;');

      // Удаляем данные в правильном порядке (от зависимых к независимым)
      // 1. Удаляем посещаемость (зависит от студентов и групп)
      if (parseInt(attendancesCount[0].count) > 0) {
        await queryRunner.query('TRUNCATE TABLE attendances RESTART IDENTITY CASCADE;');
        console.log(`✅ Удалено записей посещаемости: ${attendancesCount[0].count}`);
      }

      // 2. Удаляем платежи (зависит от студентов и курсов)
      if (parseInt(paymentsCount[0].count) > 0) {
        await queryRunner.query('TRUNCATE TABLE payments RESTART IDENTITY CASCADE;');
        console.log(`✅ Удалено платежей: ${paymentsCount[0].count}`);
      }

      // 3. Удаляем оценки (зависит от студентов)
      if (parseInt(gradesCount[0].count) > 0) {
        await queryRunner.query('TRUNCATE TABLE grades RESTART IDENTITY CASCADE;');
        console.log(`✅ Удалено оценок: ${gradesCount[0].count}`);
      }

      // 4. Удаляем расписание (зависит от групп)
      if (parseInt(schedulesCount[0].count) > 0) {
        await queryRunner.query('TRUNCATE TABLE schedules RESTART IDENTITY CASCADE;');
        console.log(`✅ Удалено расписаний: ${schedulesCount[0].count}`);
      }

      // 5. Удаляем заявки на курсы
      if (parseInt(courseRequestsCount[0].count) > 0) {
        await queryRunner.query('TRUNCATE TABLE course_requests RESTART IDENTITY CASCADE;');
        console.log(`✅ Удалено заявок на курсы: ${courseRequestsCount[0].count}`);
      }

      // 6. Отвязываем студентов от групп перед удалением групп
      await queryRunner.query('UPDATE students SET group_id = NULL WHERE group_id IS NOT NULL;');
      
      // 7. Удаляем группы (зависит от курсов)
      if (parseInt(groupsCount[0].count) > 0) {
        await queryRunner.query('TRUNCATE TABLE groups RESTART IDENTITY CASCADE;');
        console.log(`✅ Удалено групп: ${groupsCount[0].count}`);
      }

      // 8. Удаляем студентов
      if (parseInt(studentsCount[0].count) > 0) {
        await queryRunner.query('TRUNCATE TABLE students RESTART IDENTITY CASCADE;');
        console.log(`✅ Удалено студентов: ${studentsCount[0].count}`);
      }

      // 9. Удаляем курсы (зависит от преподавателей)
      if (parseInt(coursesCount[0].count) > 0) {
        await queryRunner.query('TRUNCATE TABLE courses RESTART IDENTITY CASCADE;');
        console.log(`✅ Удалено курсов: ${coursesCount[0].count}`);
      }

      // 10. Отвязываем преподавателей от пользователей перед удалением
      await queryRunner.query('UPDATE teachers SET user_id = NULL WHERE user_id IS NOT NULL;');
      
      // 11. Удаляем преподавателей
      if (parseInt(teachersCount[0].count) > 0) {
        await queryRunner.query('TRUNCATE TABLE teachers RESTART IDENTITY CASCADE;');
        console.log(`✅ Удалено преподавателей: ${teachersCount[0].count}`);
      }

      // 12. Удаляем филиалы
      if (parseInt(branchesCount[0].count) > 0) {
        await queryRunner.query('TRUNCATE TABLE branches RESTART IDENTITY CASCADE;');
        console.log(`✅ Удалено филиалов: ${branchesCount[0].count}`);
      }

      // 13. Удаляем всех пользователей кроме админа
      if (parseInt(usersCount[0].count) > 0) {
        await queryRunner.query(`DELETE FROM users WHERE NOT (username = 'admin' AND role = 'admin');`);
        const deletedCount = parseInt(usersCount[0].count) - (admin ? 1 : 0);
        console.log(`✅ Удалено пользователей: ${deletedCount}`);
      }

      // Включаем обратно проверку внешних ключей
      await queryRunner.query('SET session_replication_role = DEFAULT;');

      await queryRunner.commitTransaction();
      console.log("\n✅ Транзакция успешно завершена!");
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("❌ Ошибка при удалении данных, откат транзакции...");
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Восстанавливаем администратора (вне транзакции)
    console.log("\n🔄 Восстановление администратора...");
    
    // Проверяем, существует ли админ
    const existingAdmin = await userRepository.findOne({
      where: { username: "admin", role: UserRole.ADMIN },
    });

    if (existingAdmin) {
      // Обновляем существующего админа
      existingAdmin.email = adminData.email;
      existingAdmin.firstName = adminData.firstName;
      existingAdmin.lastName = adminData.lastName;
      existingAdmin.isActive = adminData.isActive;
      
      // Если сохраняли хеш пароля, используем его
      if (adminData.password.startsWith("$2")) {
        existingAdmin.password = adminData.password;
      } else {
        existingAdmin.password = adminData.password;
        await existingAdmin.hashPassword();
      }
      
      await userRepository.save(existingAdmin);
      console.log("✅ Администратор обновлен!");
    } else {
      // Создаем нового админа
      const newAdmin = userRepository.create({
        username: adminData.username,
        email: adminData.email,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        role: adminData.role,
        isActive: adminData.isActive,
      });

      // Если сохраняли хеш пароля, используем его, иначе хешируем новый
      if (adminData.password.startsWith("$2")) {
        newAdmin.password = adminData.password;
      } else {
        newAdmin.password = adminData.password;
        await newAdmin.hashPassword();
      }

      await userRepository.save(newAdmin);
      console.log("✅ Администратор создан!");
    }
    
    console.log(`   Username: ${adminData.username}`);
    console.log(`   Email: ${adminData.email}`);
    console.log(`   Role: ${adminData.role}`);

    console.log("\n✅ База данных успешно очищена!");
    console.log("   Все данные удалены, кроме учетных данных администратора.");

    await AppDataSource.destroy();
    console.log("🔌 Соединение закрыто.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Ошибка:", error);
    await AppDataSource.destroy().catch(() => {});
    process.exit(1);
  }
}

clearAllData();








