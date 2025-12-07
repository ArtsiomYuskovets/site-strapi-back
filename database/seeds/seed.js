'use strict';

module.exports = async ({ strapi }) => {
  try {
    strapi.log.info('Starting seed...');
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

    const roles = await strapi.entityService.findMany('plugin::users-permissions.role', {});
    let editorRole = roles.find(r => r.type === 'editor');
    if (!editorRole) {
      strapi.log.info('Creating editor role...');
      try {
        editorRole = await strapi.entityService.create('plugin::users-permissions.role', {
          data: {
            name: 'Editor',
            type: 'editor',
            description: 'Editor role with full article management permissions',
          },
        });
        strapi.log.info('Editor role created successfully');
      } catch (error) {
        strapi.log.warn(`Could not create editor role: ${error.message}. Using authenticated role instead.`);
        editorRole = roles.find(r => r.type === 'authenticated');
        if (!editorRole) {
          throw new Error('Could not create editor role and authenticated role not found');
        }
      }
    } else {
      strapi.log.info('Editor role already exists');
    }
    
    let authenticatedRole = roles.find(r => r.type === 'authenticated');
    if (!authenticatedRole) {
      strapi.log.error('Authenticated role not found!');
      throw new Error('Authenticated role not found');
    }

    const usersService = strapi.plugin('users-permissions').service('user');
    const createOrUpdateUser = async (userData, role) => {
      const existing = await usersService.fetchAll({
        filters: { email: userData.email },
      });

      if (existing.length === 0) {
        try {
          const user = await usersService.add({
            username: userData.username,
            email: userData.email,
            password: userData.password,
            confirmed: true,
            blocked: false,
          });
          
          if (role && role.id) {
            await strapi.entityService.update('plugin::users-permissions.user', user.id, {
              data: {
                role: role.id,
              },
            });
          }
          
          const createdUser = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
            populate: ['role'],
          });
          strapi.log.info(`Created user: ${userData.email}, id: ${createdUser.id}, role: ${createdUser.role?.type || 'none'}, confirmed: ${createdUser.confirmed}, blocked: ${createdUser.blocked}`);
          return createdUser;
        } catch (error) {
          strapi.log.error(`Error creating user ${userData.email}:`, error);
          throw error;
        }
      } else {
        const existingUser = existing[0];
        strapi.log.info(`User ${userData.email} already exists, recreating...`);
        
        try {
          await strapi.entityService.delete('plugin::users-permissions.user', existingUser.id);
          strapi.log.info(`Deleted existing user: ${userData.email}`);
          const user = await usersService.add({
            username: userData.username,
            email: userData.email,
            password: userData.password,
            confirmed: true,
            blocked: false,
          });
          
          if (role && role.id) {
            await strapi.entityService.update('plugin::users-permissions.user', user.id, {
              data: {
                role: role.id,
              },
            });
          }
          
          const recreatedUser = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
            populate: ['role'],
          });
          strapi.log.info(`Recreated user: ${userData.email}, id: ${recreatedUser.id}, role: ${recreatedUser.role?.type || 'none'}, confirmed: ${recreatedUser.confirmed}, blocked: ${recreatedUser.blocked}`);
          return recreatedUser;
        } catch (error) {
          strapi.log.error(`Error recreating user ${userData.email}:`, error);
          throw error;
        }
      }
    };

    let editorUser = await createOrUpdateUser({
      username: 'editor',
      email: 'editor@example.com',
      password: 'Editor123!',
    }, editorRole);

    let editorUser2 = await createOrUpdateUser({
      username: 'editor2',
      email: 'editor2@example.com',
      password: 'Editor123!',
    }, editorRole);

    let authUser = await createOrUpdateUser({
      username: 'user',
      email: 'user@example.com',
      password: 'User123!',
    }, authenticatedRole);

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




