if (process.env.RUN_SEED === 'true') {
  const path = require('path');
  process.chdir(__dirname + '/..');
  
  (async () => {
    try {
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

