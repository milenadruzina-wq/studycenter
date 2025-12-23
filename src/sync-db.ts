import "reflect-metadata";
import { AppDataSource } from "./data-source";

async function syncDatabase() {
  try {
    console.log("🔄 Начало синхронизации базы данных...");
    const dbOptions = AppDataSource.options as any;
    console.log(`📊 База данных: ${dbOptions.database}`);
    console.log(`🏠 Хост: ${dbOptions.host}:${dbOptions.port}`);
    
    // Инициализация подключения к БД
    await AppDataSource.initialize();
    
    console.log("✅ База данных успешно подключена!");
    console.log("✅ Автосинхронизация схемы выполнена!");
    console.log("\n📚 Созданные таблицы:");
    console.log("  - students");
    console.log("  - teachers");
    console.log("  - courses");
    console.log("  - groups");
    console.log("  - schedules");
    console.log("  - grades");
    console.log("  - users");
    console.log("  - attendances");
    
    console.log("\n✨ Синхронизация завершена успешно!");
    
    // Закрываем соединение
    await AppDataSource.destroy();
    console.log("🔌 Соединение с базой данных закрыто.");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Ошибка при синхронизации базы данных:", error);
    process.exit(1);
  }
}

syncDatabase();



