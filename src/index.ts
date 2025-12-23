import "reflect-metadata";
import { AppDataSource } from "./data-source";

async function main() {
  try {
    console.log("Подключение к базе данных...");
    
    // Инициализация подключения к БД
    await AppDataSource.initialize();
    
    console.log("✅ База данных успешно подключена!");
    console.log("✅ Автосинхронизация схемы включена");
    console.log(`📊 База данных: ${AppDataSource.options.database}`);
    
    console.log("\n📚 Доступные репозитории:");
    console.log("  - Student");
    console.log("  - Teacher");
    console.log("  - Course");
    console.log("  - Group");
    console.log("  - Schedule");
    console.log("  - Grade");
    
    console.log("\n✨ Система готова к работе!");
    
    // Не закрываем соединение, чтобы приложение продолжало работать
    // Если нужно закрыть: await AppDataSource.destroy();
    
  } catch (error) {
    console.error("❌ Ошибка при подключении к базе данных:", error);
    process.exit(1);
  }
}

// Обработка завершения процесса
process.on("SIGINT", async () => {
  console.log("\nЗавершение работы...");
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log("Соединение с базой данных закрыто.");
  }
  process.exit(0);
});

main();

