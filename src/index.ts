// import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    // Запуск seed при старте (только если установлена переменная окружения)
    if (process.env.RUN_SEED === 'true') {
      try {
        const seedModule = require('../../database/seeds/seed.js');
        await seedModule({ strapi });
        strapi.log.info('Seed completed successfully!');
      } catch (error) {
        strapi.log.error('Seed error:', error);
      }
    }
  },
};
