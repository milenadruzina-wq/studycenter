import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { User, UserRole } from "../entities/User";

async function createAdmin() {
  try {
    console.log("🔄 Подключение к базе данных...");
    await AppDataSource.initialize();
    console.log("✅ База данных подключена!");

    const userRepository = AppDataSource.getRepository(User);

    // Проверяем, существует ли уже админ
    const existingAdmin = await userRepository.findOne({
      where: { username: "admin" },
    });

    if (existingAdmin) {
      console.log("ℹ️  Администратор уже существует");
      // Обновляем пароль на случай, если нужно сбросить
      existingAdmin.password = "admin201075";
      await existingAdmin.hashPassword();
      await userRepository.save(existingAdmin);
      console.log("✅ Пароль администратора обновлен");
    } else {
      // Создаем нового админа
      const admin = userRepository.create({
        username: "admin",
        password: "admin201075",
        email: "admin@studycenter.ru",
        firstName: "Администратор",
        lastName: "Системы",
        role: UserRole.ADMIN,
        isActive: true,
      });

      await admin.hashPassword();
      await userRepository.save(admin);
      console.log("✅ Администратор создан!");
      console.log("   Username: admin");
      console.log("   Password: admin201075");
    }

    await AppDataSource.destroy();
    console.log("🔌 Соединение закрыто.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Ошибка:", error);
    process.exit(1);
  }
}

createAdmin();













