'use strict';

/**
 * Seed script for creating initial data
 * Run with: strapi ts:execute database/seeds/seed.js
 */

module.exports = async ({ strapi }) => {
  try {
    strapi.log.info('Starting seed...');

    // Create categories
    const categories = [
      { name: 'Технологии', slug: 'technology' },
      { name: 'Политика', slug: 'politics' },
      { name: 'Спорт', slug: 'sports' },
      { name: 'Культура', slug: 'culture' },
    ];

    const createdCategories = [];
    for (const categoryData of categories) {
      const existing = await strapi.entityService.findMany('api::category.category', {
        filters: { slug: categoryData.slug },
      });

      if (existing.length === 0) {
        const category = await strapi.entityService.create('api::category.category', {
          data: categoryData,
        });
        createdCategories.push(category);
        strapi.log.info(`Created category: ${category.name}`);
      } else {
        createdCategories.push(existing[0]);
        strapi.log.info(`Category already exists: ${categoryData.name}`);
      }
    }

    // Get roles
    const roleService = strapi.plugin('users-permissions').service('role');
    const roles = await roleService.find();
    
    // Find editor role (or authenticated if editor doesn't exist)
    let editorRole = roles.find(r => r.type === 'editor') || roles.find(r => r.type === 'authenticated');
    let authenticatedRole = roles.find(r => r.type === 'authenticated');
    
    if (!editorRole) {
      strapi.log.warn('Editor role not found, using authenticated role');
      editorRole = authenticatedRole;
    }
    
    if (!authenticatedRole) {
      strapi.log.error('Authenticated role not found!');
      throw new Error('Authenticated role not found');
    }

    // Create users
    const usersService = strapi.plugin('users-permissions').service('user');
    
    // Create editor user
    let editorUser = await usersService.fetchAll({
      filters: { email: 'editor@example.com' },
    });

    if (editorUser.length === 0) {
      editorUser = await usersService.add({
        username: 'editor',
        email: 'editor@example.com',
        password: 'Editor123!',
        confirmed: true,
        role: editorRole.id,
      });
      strapi.log.info('Created editor user: editor@example.com');
    } else {
      editorUser = editorUser[0];
      strapi.log.info('Editor user already exists');
    }

    // Create authenticated user
    let authUser = await usersService.fetchAll({
      filters: { email: 'user@example.com' },
    });

    if (authUser.length === 0) {
      authUser = await usersService.add({
        username: 'user',
        email: 'user@example.com',
        password: 'User123!',
        confirmed: true,
        role: authenticatedRole.id,
      });
      strapi.log.info('Created authenticated user: user@example.com');
    } else {
      authUser = authUser[0];
      strapi.log.info('Authenticated user already exists');
    }

    // Create articles
    const articles = [
      {
        title: 'Новые технологии в веб-разработке',
        slug: 'new-web-technologies',
        excerpt: 'Обзор последних тенденций в веб-разработке и новых фреймворков.',
        content: '<p>Веб-разработка продолжает развиваться быстрыми темпами. В этой статье мы рассмотрим последние тенденции и технологии, которые меняют индустрию.</p><p>Vue 3, React 18, и новые возможности TypeScript открывают новые горизонты для разработчиков.</p>',
        isFeatured: true,
        tags: ['технологии', 'веб-разработка', 'программирование'],
        readingTime: 5,
        views: 150,
        category: createdCategories[0]?.id,
        author: editorUser.id,
        publishedAt: new Date(),
      },
      {
        title: 'Политические изменения в регионе',
        slug: 'political-changes-region',
        excerpt: 'Анализ последних политических событий и их влияние на регион.',
        content: '<p>Политическая ситуация в регионе претерпевает значительные изменения. Эксперты анализируют последние события и их возможные последствия.</p>',
        isFeatured: false,
        tags: ['политика', 'новости'],
        readingTime: 3,
        views: 89,
        category: createdCategories[1]?.id,
        author: editorUser.id,
        publishedAt: new Date(),
      },
      {
        title: 'Чемпионат мира по футболу 2024',
        slug: 'world-cup-2024',
        excerpt: 'Обзор матчей и результатов чемпионата мира по футболу.',
        content: '<p>Чемпионат мира по футболу 2024 года принес множество сюрпризов и ярких моментов. В этой статье мы подводим итоги турнира.</p>',
        isFeatured: true,
        tags: ['спорт', 'футбол', 'чемпионат'],
        readingTime: 7,
        views: 234,
        category: createdCategories[2]?.id,
        author: editorUser.id,
        publishedAt: new Date(),
      },
      {
        title: 'Новая выставка в музее современного искусства',
        slug: 'modern-art-exhibition',
        excerpt: 'Открытие новой выставки современного искусства привлекло внимание критиков.',
        content: '<p>Музей современного искусства представил новую выставку, которая объединяет работы известных художников со всего мира.</p>',
        isFeatured: false,
        tags: ['культура', 'искусство', 'выставка'],
        readingTime: 4,
        views: 67,
        category: createdCategories[3]?.id,
        author: authUser.id,
        publishedAt: new Date(),
      },
      {
        title: 'Искусственный интеллект в медицине',
        slug: 'ai-in-medicine',
        excerpt: 'Как искусственный интеллект революционизирует медицинскую диагностику.',
        content: '<p>Искусственный интеллект находит все больше применений в медицине. От диагностики до разработки новых лекарств - ИИ меняет подход к здравоохранению.</p>',
        isFeatured: true,
        tags: ['технологии', 'медицина', 'искусственный интеллект'],
        readingTime: 6,
        views: 312,
        category: createdCategories[0]?.id,
        author: editorUser.id,
        publishedAt: new Date(),
      },
    ];

    for (const articleData of articles) {
      const existing = await strapi.entityService.findMany('api::article.article', {
        filters: { slug: articleData.slug },
      });

      if (existing.length === 0) {
        await strapi.entityService.create('api::article.article', {
          data: articleData,
        });
        strapi.log.info(`Created article: ${articleData.title}`);
      } else {
        strapi.log.info(`Article already exists: ${articleData.title}`);
      }
    }

    strapi.log.info('Seed completed successfully!');
  } catch (error) {
    strapi.log.error('Seed error:', error);
    throw error;
  }
};




