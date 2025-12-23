import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";

async function testAdminLogin() {
  try {
    console.log("🔄 Подключение к базе данных...");
    await AppDataSource.initialize();
    console.log("✅ База данных подключена!");

    const userRepository = AppDataSource.getRepository(User);

    // Ищем админа
    const admin = await userRepository.findOne({
      where: { username: "admin" },
    });

    if (!admin) {
      console.log("❌ Администратор не найден!");
      process.exit(1);
    }

    console.log("✅ Администратор найден:");
    console.log(`   ID: ${admin.id}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   IsActive: ${admin.isActive}`);
    console.log(`   Password hash: ${admin.password.substring(0, 20)}...`);

    // Тестируем пароль
    const testPassword = "admin201075";
    console.log(`\n🔐 Тестирование пароля: ${testPassword}`);
    
    const isValid = await admin.comparePassword(testPassword);
    
    if (isValid) {
      console.log("✅ Пароль правильный!");
    } else {
      console.log("❌ Пароль неверный!");
      console.log("Попробуем пересоздать пароль...");
      
      admin.password = testPassword;
      await admin.hashPassword();
      await userRepository.save(admin);
      console.log("✅ Пароль пересоздан!");
      
      // Проверяем еще раз
      const isValidAfter = await admin.comparePassword(testPassword);
      if (isValidAfter) {
        console.log("✅ Пароль теперь работает!");
      } else {
        console.log("❌ Пароль все еще не работает!");
      }
    }

    await AppDataSource.destroy();
    console.log("🔌 Соединение закрыто.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Ошибка:", error);
    process.exit(1);
  }
}

testAdminLogin();












