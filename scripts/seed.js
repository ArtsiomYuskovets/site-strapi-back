// Простой способ - используем bootstrap функцию
// Запустите: npm run develop
// Затем в другом терминале: npm run console
// И выполните: const seed = require('./database/seeds/seed.js'); await seed({ strapi });

// Или используйте этот скрипт через bootstrap
console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Для запуска seed используйте один из способов:            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Способ 1 (рекомендуется):                                  ║
║  1. Запустите Strapi: npm run develop                       ║
║  2. В другом терминале: npm run console                     ║
║  3. В консоли выполните:                                     ║
║     const seed = require('./database/seeds/seed.js');       ║
║     await seed({ strapi });                                  ║
║                                                              ║
║  Способ 2 (через bootstrap):                                ║
║  Добавьте seed в src/index.ts в функцию bootstrap          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

// Попробуем автоматический запуск через переменную окружения
if (process.env.RUN_SEED === 'true') {
  const path = require('path');
  process.chdir(__dirname + '/..');
  
  (async () => {
    try {
      // Используем динамический импорт для ESM модулей
      const { createStrapi } = await import('@strapi/strapi');
      
      const strapi = await createStrapi({
        distDir: path.resolve(__dirname, '..', 'dist'),
        appDir: path.resolve(__dirname, '..'),
      });
      
      await strapi.load();
      
      const seedModule = require('../database/seeds/seed.js');
      await seedModule({ strapi });
      
      strapi.log.info('Seed completed successfully!');
      await strapi.destroy();
      process.exit(0);
    } catch (error) {
      console.error('Seed error:', error);
      process.exit(1);
    }
  })();
}

