export default {
  register() {},

  async bootstrap({ strapi }) {
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
