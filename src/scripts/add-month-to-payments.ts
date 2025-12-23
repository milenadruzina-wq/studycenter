import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { Payment } from "../entities/Payment";

async function addMonthToPayments() {
  try {
    console.log("🔄 Подключение к базе данных...");
    await AppDataSource.initialize();
    console.log("✅ База данных подключена!");

    const queryRunner = AppDataSource.createQueryRunner();

    // Проверяем, существует ли поле month
    const table = await queryRunner.getTable("payments");
    const hasMonthColumn = table?.columns.find(col => col.name === "month");

    if (!hasMonthColumn) {
      console.log("🔄 Добавление поля month в таблицу payments...");
      // Добавляем поле как nullable сначала
      await queryRunner.query(`
        ALTER TABLE payments 
        ADD COLUMN IF NOT EXISTS month VARCHAR(7) NULL;
      `);
      console.log("✅ Поле month добавлено!");
    } else {
      console.log("ℹ️  Поле month уже существует");
    }

    // Получаем ВСЕ платежи через queryRunner для работы с сырыми данными
    const allPayments = await queryRunner.query(`
      SELECT id, "paymentDate", month
      FROM payments;
    `);

    console.log(`\n📊 Всего платежей в базе: ${allPayments.length}`);

    // Фильтруем платежи, которые нужно обновить
    const paymentsToUpdate = allPayments.filter(p => !p.month || p.month === '');

    console.log(`📊 Найдено платежей без поля month: ${paymentsToUpdate.length}`);

    let updatedCount = 0;

    // Обновляем все платежи, где month IS NULL или пустое
    for (const payment of paymentsToUpdate) {
      // Проверяем, что paymentDate существует
      if (!payment.paymentDate) {
        console.log(`⚠️  Пропуск платежа ID ${payment.id}: paymentDate отсутствует`);
        continue;
      }

      try {
        // Извлекаем месяц из paymentDate
        const paymentDate = new Date(payment.paymentDate);
        
        // Проверяем, что дата валидна
        if (isNaN(paymentDate.getTime())) {
          console.log(`⚠️  Пропуск платежа ID ${payment.id}: невалидная дата ${payment.paymentDate}`);
          continue;
        }

        const year = paymentDate.getFullYear();
        const month = paymentDate.getMonth() + 1; // getMonth() возвращает 0-11
        const monthString = `${year}-${String(month).padStart(2, '0')}`;

        // Обновляем платеж через SQL
        await queryRunner.query(`
          UPDATE payments 
          SET month = $1 
          WHERE id = $2
        `, [monthString, payment.id]);

        updatedCount++;
        console.log(`✓ Обновлен платеж ID ${payment.id}: месяц = ${monthString}`);
      } catch (error: any) {
        console.error(`❌ Ошибка при обновлении платежа ID ${payment.id}:`, error.message);
      }
    }

    // Проверяем, что все записи заполнены
    const nullCount = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM payments 
      WHERE month IS NULL OR month = '';
    `);

    const nullPaymentsCount = parseInt(nullCount[0].count);

    if (nullPaymentsCount > 0) {
      console.log(`\n⚠️  ВНИМАНИЕ: Осталось ${nullPaymentsCount} платежей с пустым month!`);
      console.log("❌ Нельзя установить поле как NOT NULL. Проверьте данные.");
      console.log("\n💡 Рекомендация: Проверьте эти платежи и заполните month вручную или удалите их.");
    } else {
      // Если все платежи обновлены, делаем поле NOT NULL
      console.log("\n🔄 Установка поля month как NOT NULL...");
      try {
        // Сначала проверяем, что поле не является NOT NULL
        const columnInfo = await queryRunner.query(`
          SELECT is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'payments' AND column_name = 'month';
        `);
        
        if (columnInfo.length > 0 && columnInfo[0].is_nullable === 'YES') {
          await queryRunner.query(`
            ALTER TABLE payments 
            ALTER COLUMN month SET NOT NULL;
          `);
          console.log("✅ Поле month установлено как NOT NULL!");
          
          // После успешной установки NOT NULL, обновляем entity
          console.log("\n💡 ВАЖНО: Обновите src/entities/Payment.ts:");
          console.log('   Измените: @Column({ type: "varchar", length: 7, nullable: true })');
          console.log('   На:       @Column({ type: "varchar", length: 7, nullable: false })');
        } else {
          console.log("ℹ️  Поле month уже установлено как NOT NULL");
        }
      } catch (error: any) {
        console.error("❌ Ошибка при установке NOT NULL:", error.message);
        console.log("ℹ️  Поле останется nullable. Проверьте данные вручную.");
      }
    }

    await queryRunner.release();

    console.log(`\n✅ Обновлено платежей: ${updatedCount}`);

    await AppDataSource.destroy();
    console.log("\n✅ Миграция завершена!");
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

addMonthToPayments();







