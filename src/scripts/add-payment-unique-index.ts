import "reflect-metadata";
import { AppDataSource } from "../data-source";

async function addPaymentUniqueIndex() {
  try {
    console.log("🔄 Подключение к базе данных...");
    await AppDataSource.initialize();
    console.log("✅ База данных подключена!");

    const queryRunner = AppDataSource.createQueryRunner();

    // Проверяем, существует ли уже индекс
    const indexExists = await queryRunner.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'payments' 
      AND indexname = 'IDX_payments_student_id_month';
    `);

    if (indexExists.length > 0) {
      console.log("ℹ️  Уникальный индекс уже существует");
    } else {
      console.log("🔄 Создание уникального индекса на student_id + month...");
      
      // Сначала проверяем, нет ли дубликатов
      const duplicates = await queryRunner.query(`
        SELECT student_id, month, COUNT(*) as count
        FROM payments
        WHERE month IS NOT NULL
        GROUP BY student_id, month
        HAVING COUNT(*) > 1;
      `);

      if (duplicates.length > 0) {
        console.log(`\n⚠️  Найдено ${duplicates.length} дубликатов платежей!`);
        console.log("Нужно удалить дубликаты перед созданием уникального индекса.");
        console.log("\nДубликаты:");
        for (const dup of duplicates) {
          console.log(`  - student_id: ${dup.student_id}, month: ${dup.month}, количество: ${dup.count}`);
        }
        console.log("\n💡 Запустите скрипт fix-payments для удаления дубликатов:");
        console.log("   npm run fix-payments");
      } else {
        // Создаем уникальный индекс
        await queryRunner.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS "IDX_payments_student_id_month" 
          ON payments (student_id, month)
          WHERE month IS NOT NULL;
        `);
        console.log("✅ Уникальный индекс создан!");
      }
    }

    await queryRunner.release();

    await AppDataSource.destroy();
    console.log("\n✅ Готово!");
    console.log("🔌 Соединение закрыто.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Ошибка:", error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

addPaymentUniqueIndex();







