import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::article.article' as any, ({ strapi }) => ({
  /**
   * Standard find method - delegates to core controller
   */
  async find(ctx: any) {
    const query = ctx.query || {};
    const entityService = strapi.entityService;
    
    // Parse populate parameter - используем простой массив для Strapi v5
    let populate: string[] = ['category', 'author', 'coverImage'];
    
    if (query.populate) {
      if (typeof query.populate === 'string') {
        populate = query.populate.split(',').map((p: string) => p.trim());
      } else if (Array.isArray(query.populate)) {
        populate = query.populate;
      }
    }
    
    // Убеждаемся, что author всегда включен
    if (!populate.includes('author')) {
      populate.push('author');
    }
    
    strapi.log.info('Using populate:', populate.join(', '));
    
    // Создаем опции для findMany
    const findOptions: any = {
      populate,
    };
    
    // Добавляем фильтры, если есть
    if (query.filters) {
      findOptions.filters = query.filters;
    }
    
    // Добавляем сортировку, если есть
    if (query.sort) {
      findOptions.sort = query.sort;
    }
    
    // Добавляем пагинацию, если есть
    if (query.pagination) {
      findOptions.pagination = query.pagination;
    }
    
    const entities = await entityService.findMany('api::article.article' as any, findOptions);
    
    // Логируем результат для отладки - используем console.log для полного вывода
    if (entities && entities.length > 0) {
      const firstArticle = entities[0] as any;
      console.log('[Article Controller] First article BEFORE sanitize:', JSON.stringify({
        id: firstArticle.id,
        title: firstArticle.title,
        hasAuthor: !!firstArticle.author,
        author: firstArticle.author
      }, null, 2));
      
      strapi.log.info(`Found ${entities.length} articles`);
      strapi.log.info(`First article has author: ${!!firstArticle.author}`);
      if (firstArticle.author) {
        strapi.log.info(`Author ID: ${firstArticle.author.id}, Username: ${firstArticle.author.username}`);
      }
    }

    const sanitizedEntities = await this.sanitizeOutput(entities, ctx);
    
    // Логируем после sanitize
    if (sanitizedEntities && Array.isArray(sanitizedEntities) && sanitizedEntities.length > 0) {
      const firstSanitized = sanitizedEntities[0] as any;
      console.log('[Article Controller] First article AFTER sanitize:', JSON.stringify({
        id: firstSanitized.id,
        title: firstSanitized.title,
        hasAuthor: !!firstSanitized.author,
        author: firstSanitized.author
      }, null, 2));
      
      strapi.log.info(`After sanitize - has author: ${!!firstSanitized.author}`);
      if (firstSanitized.author) {
        strapi.log.info(`Author ID: ${firstSanitized.author.id}, Username: ${firstSanitized.author.username}`);
      } else {
        strapi.log.warn('WARNING: Author was removed during sanitize! Check User model permissions.');
      }
    }
    
    return this.transformResponse(sanitizedEntities);
  },

  /**
   * Standard findOne method - delegates to core controller
   */
  async findOne(ctx: any) {
    const { id } = ctx.params;
    const query = ctx.query || {};
    const entityService = strapi.entityService;

    // Parse populate parameter - используем простой массив
    let populate: string[] = ['category', 'author', 'coverImage'];
    
    if (query.populate) {
      if (typeof query.populate === 'string') {
        populate = query.populate.split(',').map((p: string) => p.trim());
      } else if (Array.isArray(query.populate)) {
        populate = query.populate;
      }
    }
    
    // Убеждаемся, что author всегда включен
    if (!populate.includes('author')) {
      populate.push('author');
    }

    const entity = await entityService.findOne('api::article.article' as any, id, {
      ...query,
      populate,
    });

    if (!entity) {
      return ctx.notFound('Article not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Standard create method - sets author automatically
   */
  async create(ctx: any) {
    const { data } = ctx.request.body || {};
    const query = ctx.query || {};
    const user = ctx.state.user;
    const entityService = strapi.entityService;

    if (!user) {
      return ctx.unauthorized('You must be authenticated');
    }

    // Если пользователь не редактор и не указал автора, устанавливаем текущего пользователя как автора
    const isEditor = user.role?.type === 'editor';
    if (!isEditor && !data.author) {
      data.author = user.id;
    }

    const entity = await entityService.create('api::article.article' as any, {
      data,
      ...query,
      populate: query.populate || ['category', 'author', 'coverImage'],
    });

    // Log the action
    strapi.log.info(`Article created by user ${user.id}`);

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Standard update method - checks permissions
   */
  async update(ctx: any) {
    const { id } = ctx.params;
    const { data } = ctx.request.body || {};
    const query = ctx.query || {};
    const user = ctx.state.user;
    const entityService = strapi.entityService;

    if (!user) {
      return ctx.unauthorized('You must be authenticated');
    }

    // Проверяем права перед обновлением
    const article: any = await entityService.findOne('api::article.article' as any, id, {
      populate: ['author'],
    });

    if (!article) {
      return ctx.notFound('Article not found');
    }

    // Check if user is editor or article author
    const isEditor = user.role?.type === 'editor';
    // Сравниваем ID (могут быть разных типов)
    const authorId = Number(article.author?.id);
    const userId = Number(user.id);
    const isAuthor = authorId === userId;

    strapi.log.info(`Update check: user ${userId}, author ${authorId}, isEditor: ${isEditor}, isAuthor: ${isAuthor}`);

    if (!isEditor && !isAuthor) {
      return ctx.forbidden('You can only update your own articles or be an editor');
    }

    // Proceed with update
    const entity = await entityService.update('api::article.article' as any, id, {
      data,
      ...query,
      populate: query.populate || ['category', 'author', 'coverImage'],
    });

    if (!entity) {
      return ctx.notFound('Article not found');
    }

    // Log the action
    strapi.log.info(`Article ${id} updated by user ${user.id}`);

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Get featured articles
   * GET /api/articles/featured
   */
  async featured(ctx: any) {
    try {
      const { query } = ctx;
      
      // Parse populate parameter - can be string or array
      let populate = ['category', 'author', 'coverImage'];
      if (query.populate) {
        if (typeof query.populate === 'string') {
          populate = query.populate.split(',').map((p: string) => p.trim());
        } else if (Array.isArray(query.populate)) {
          populate = query.populate;
        }
      }
      
      const entities = await strapi.entityService.findMany('api::article.article' as any, {
        ...query,
        filters: {
          ...query.filters,
          isFeatured: { $eq: true },
          publishedAt: { $notNull: true },
        },
        populate,
        sort: query.sort || { publishedAt: 'desc' },
      });

      const sanitizedEntities = await this.sanitizeOutput(entities, ctx);
      return this.transformResponse(sanitizedEntities);
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  /**
   * Publish article (only for editors)
   * POST /api/articles/:id/publish
   */
  async publish(ctx: any) {
    try {
      const { id } = ctx.params;
      const user = ctx.state.user;

      // Check if user is editor
      if (!user || user.role?.type !== 'editor') {
        return ctx.unauthorized('Only editors can publish articles');
      }

      const article = await strapi.entityService.findOne('api::article.article' as any, id, {
        populate: ['author'],
      });

      if (!article) {
        return ctx.notFound('Article not found');
      }

      // Update article with publishedAt
      const updatedArticle = await strapi.entityService.update('api::article.article' as any, id, {
        data: {
          publishedAt: new Date(),
        },
        populate: ['category', 'author', 'coverImage'],
      });

      // Log the action
      strapi.log.info(`Article ${id} published by user ${user.id}`);

      const sanitizedEntity = await this.sanitizeOutput(updatedArticle, ctx);
      return this.transformResponse(sanitizedEntity);
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  /**
   * Increment views counter
   * POST /api/articles/:id/view
   */
  async incrementViews(ctx: any) {
    try {
      const { id } = ctx.params;

      const article: any = await strapi.entityService.findOne('api::article.article' as any, id, {
        fields: ['views'],
      });

      if (!article) {
        return ctx.notFound('Article not found');
      }

      const updatedArticle: any = await strapi.entityService.update('api::article.article' as any, id, {
        data: {
          views: (article.views || 0) + 1,
        },
      });

      return ctx.send({ views: updatedArticle.views });
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  /**
   * Override delete to check permissions
   */
  async delete(ctx: any) {
    try {
      const { id } = ctx.params;
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('You must be authenticated');
      }

      const article: any = await strapi.entityService.findOne('api::article.article' as any, id, {
        populate: ['author'],
      });

      if (!article) {
        return ctx.notFound('Article not found');
      }

      // Check if user is editor or article author
      const isEditor = user.role?.type === 'editor';
      // Сравниваем ID (могут быть разных типов)
      const authorId = Number(article.author?.id);
      const userId = Number(user.id);
      const isAuthor = authorId === userId;

      strapi.log.info(`Delete check: user ${userId}, author ${authorId}, isEditor: ${isEditor}, isAuthor: ${isAuthor}`);

      if (!isEditor && !isAuthor) {
        return ctx.forbidden('You can only delete your own articles or be an editor');
      }

      // Proceed with deletion
      const deletedArticle = await strapi.entityService.delete('api::article.article' as any, id);

      // Log the action
      strapi.log.info(`Article ${id} deleted by user ${user.id}`);

      const sanitizedEntity = await this.sanitizeOutput(deletedArticle, ctx);
      return this.transformResponse(sanitizedEntity);
    } catch (err) {
      ctx.throw(500, err);
    }
  },
}));

