import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::article.article' as any, ({ strapi }) => ({
  async find(ctx: any) {
    const query = ctx.query || {};
    const entityService = strapi.entityService;
    
    let populate: string[] = ['category', 'author', 'coverImage'];
    
    if (query.populate) {
      if (typeof query.populate === 'string') {
        populate = query.populate.split(',').map((p: string) => p.trim());
      } else if (Array.isArray(query.populate)) {
        populate = query.populate;
      }
    }
    
    if (!populate.includes('author')) {
      populate.push('author');
    }
    
    const user = ctx.state.user;
    const isEditor = user?.role?.type === 'editor';
    
    const findOptions: any = {
      populate,
    };
    
    const filters: any = { ...query.filters };
    
    if (!isEditor) {
      findOptions.publicationState = 'live';
    } else {
      findOptions.publicationState = 'preview';
    }
    
    findOptions.filters = filters;
    
    if (query.sort) {
      findOptions.sort = query.sort;
    }
    
    if (query.pagination) {
      findOptions.pagination = query.pagination;
    }
    
    strapi.log.info(`[Articles Find] Request publicationState: ${findOptions.publicationState || 'not set'}, isEditor: ${isEditor}, user: ${user?.id || 'none'}`);
    strapi.log.info(`[Articles Find] Find options: ${JSON.stringify({ publicationState: findOptions.publicationState, hasFilters: !!findOptions.filters, sort: findOptions.sort, pagination: findOptions.pagination }, null, 2)}`);
    
    strapi.log.info(`[Articles Find] ===== BEFORE QUERY =====`);
    strapi.log.info(`[Articles Find] publicationState: ${findOptions.publicationState || 'NOT SET'}`);
    strapi.log.info(`[Articles Find] isEditor: ${isEditor}`);
    strapi.log.info(`[Articles Find] user: ${user?.id || 'none'}`);
    
    let entities: any[] = [];
    
    if (!isEditor) {
      const documentService = strapi.documents('api::article.article');
      
      try {
        const documents: any = await documentService.findMany({
          filters: filters,
          sort: query.sort,
          pagination: query.pagination,
          status: 'published',
          populate,
        } as any);
        
        const documentsArray = Array.isArray(documents) ? documents : (documents?.results || []);
        strapi.log.info(`[Articles Find] documentService.findMany returned ${documentsArray.length} published documents`);
        
        if (documentsArray.length > 0) {
          const firstDoc = documentsArray[0];
          strapi.log.info(`[Articles Find] First document keys: ${Object.keys(firstDoc).join(', ')}`);
          strapi.log.info(`[Articles Find] First document sample: id=${firstDoc?.id}, documentId=${firstDoc?.documentId}, title=${firstDoc?.title}, hasAuthor=${!!firstDoc?.author}, hasCategory=${!!firstDoc?.category}`);
          
          for (const doc of documentsArray) {
            if (doc && (doc.id || doc.documentId)) {
              if (doc.author || doc.category || doc.coverImage) {
                strapi.log.info(`[Articles Find] Document already has populated fields, using directly: id=${doc.id}, documentId=${doc.documentId}`);
                entities.push(doc);
              } else {
                const docId = doc.id || doc.documentId;
                strapi.log.info(`[Articles Find] Document needs populate, loading via entityService: id=${docId}`);
                try {
                  const entity = await entityService.findOne('api::article.article' as any, docId, {
                    populate,
                    publicationState: 'live',
                  });
                  if (entity) {
                    entities.push(entity);
                    strapi.log.info(`[Articles Find] Successfully loaded: id=${entity.id}, documentId=${entity.documentId}, title="${entity.title}"`);
                  } else {
                    strapi.log.warn(`[Articles Find] entityService.findOne returned null for id=${docId}`);
                  }
                } catch (err: any) {
                  strapi.log.error(`[Articles Find] Failed to load entity for id=${docId}: ${err.message}`);
                }
              }
            }
          }
          
          strapi.log.info(`[Articles Find] Successfully processed ${entities.length} out of ${documentsArray.length} documents`);
        }
        
        if (user) {
          try {
            strapi.log.info(`[Articles Find] Loading draft articles for author ${user.id}`);
            const draftDocuments: any = await documentService.findMany({
              filters: {
                ...filters,
                author: { id: { $eq: user.id } },
              },
              sort: query.sort,
              status: 'draft',
              populate,
            } as any);
            
            const draftArray = Array.isArray(draftDocuments) ? draftDocuments : (draftDocuments?.results || []);
            strapi.log.info(`[Articles Find] Found ${draftArray.length} draft articles for author ${user.id}`);
            
            for (const doc of draftArray) {
              if (doc && (doc.id || doc.documentId)) {
                if (doc.author || doc.category || doc.coverImage) {
                  const exists = entities.some((e: any) => (e.id === doc.id || e.documentId === doc.documentId));
                  if (!exists) {
                    entities.push(doc);
                    strapi.log.info(`[Articles Find] Added draft article: id=${doc.id}, documentId=${doc.documentId}, title="${doc.title}"`);
                  }
                } else {
                  const docId = doc.id || doc.documentId;
                  try {
                    const entity = await entityService.findOne('api::article.article' as any, docId, {
                      populate,
                      publicationState: 'preview',
                    });
                    if (entity) {
                      const exists = entities.some((e: any) => (e.id === entity.id || e.documentId === entity.documentId));
                      if (!exists) {
                        entities.push(entity);
                        strapi.log.info(`[Articles Find] Added draft article: id=${entity.id}, documentId=${entity.documentId}, title="${entity.title}"`);
                      }
                    }
                  } catch (err: any) {
                    strapi.log.error(`[Articles Find] Failed to load draft entity for id=${docId}: ${err.message}`);
                  }
                }
              }
            }
            
            strapi.log.info(`[Articles Find] Total articles after adding drafts: ${entities.length}`);
          } catch (err: any) {
            strapi.log.error(`[Articles Find] Error loading draft articles: ${err.message}`);
          }
        }
      } catch (err: any) {
        strapi.log.error(`[Articles Find] documentService.findMany error: ${err.message}`);
        strapi.log.error(`[Articles Find] Error stack: ${err.stack}`);
        strapi.log.info(`[Articles Find] Falling back to entityService with publicationState filter`);
        entities = await entityService.findMany('api::article.article' as any, findOptions) as any[];
      }
    } else {
      strapi.log.info(`[Articles Find] Editor mode - loading all articles (published + drafts)`);
      const documentService = strapi.documents('api::article.article');
      
      try {
        const allDocuments: any = await documentService.findMany({
          filters: filters,
          sort: query.sort,
          pagination: query.pagination,
          populate,
        } as any);
        
        const documentsArray = Array.isArray(allDocuments) ? allDocuments : (allDocuments?.results || []);
        strapi.log.info(`[Articles Find] documentService.findMany returned ${documentsArray.length} documents for editor`);
        
        if (documentsArray.length > 0) {
          for (const doc of documentsArray) {
            if (doc && (doc.id || doc.documentId)) {
              if (doc.author || doc.category || doc.coverImage) {
                entities.push(doc);
              } else {
                const docId = doc.id || doc.documentId;
                try {
                  const entity = await entityService.findOne('api::article.article' as any, docId, {
                    populate,
                    publicationState: 'preview',
                  });
                  if (entity) {
                    entities.push(entity);
                  }
                } catch (err: any) {
                  strapi.log.error(`[Articles Find] Failed to load entity for id=${docId}: ${err.message}`);
                }
              }
            }
          }
        }
      } catch (err: any) {
        strapi.log.error(`[Articles Find] documentService.findMany error for editor: ${err.message}`);
        strapi.log.info(`[Articles Find] Falling back to entityService with preview`);
        entities = await entityService.findMany('api::article.article' as any, {
          ...findOptions,
          publicationState: 'preview',
        }) as any[];
      }
    }
    
    strapi.log.info(`[Articles Find] ===== AFTER QUERY =====`);
    strapi.log.info(`[Articles Find] Total articles returned: ${entities.length}`);
    
    if (Array.isArray(entities) && entities.length > 0) {
      entities.forEach((article: any, index: number) => {
        strapi.log.info(`[Articles Find] Article ${index + 1}: id=${article.id}, documentId=${article.documentId}, title="${article.title}", publishedAt=${article.publishedAt}`);
      });
    }

    const sanitizedEntities = await this.sanitizeOutput(entities, ctx);
    
    strapi.log.info(`[Articles Find] After sanitize: ${Array.isArray(sanitizedEntities) ? sanitizedEntities.length : 0} articles`);
    if (Array.isArray(sanitizedEntities) && sanitizedEntities.length > 0) {
      sanitizedEntities.forEach((article: any, index: number) => {
        strapi.log.info(`[Articles Find] Sanitized article ${index + 1}: id=${article.id}, documentId=${article.documentId}, publishedAt=${article.publishedAt}`);
      });
    }
    
    return this.transformResponse(sanitizedEntities);
  },

  async findOne(ctx: any) {
    const { id } = ctx.params;
    const query = ctx.query || {};
    const entityService = strapi.entityService;
    const user = ctx.state.user;

    let populate: string[] = ['category', 'author', 'coverImage'];
    
    if (query.populate) {
      if (typeof query.populate === 'string') {
        populate = query.populate.split(',').map((p: string) => p.trim());
      } else if (Array.isArray(query.populate)) {
        populate = query.populate;
      }
    }
    
    if (!populate.includes('author')) {
      populate.push('author');
    }

    const isEditor = user?.role?.type === 'editor';
    
    let entity = null;
    
    if (!isEditor) {
      entity = await entityService.findOne('api::article.article' as any, id, {
        ...query,
        populate,
        publicationState: 'live',
      });
      
      if (!entity && user) {
        const draftEntity = await entityService.findOne('api::article.article' as any, id, {
          ...query,
          populate,
          publicationState: 'preview',
        });
        
        if (draftEntity) {
          const authorId = Number(draftEntity.author?.id);
          const userId = Number(user.id);
          const isAuthor = authorId === userId;
          
          if (isAuthor) {
            entity = draftEntity;
            strapi.log.info(`[Articles FindOne] Author ${userId} viewing their draft article ${id}`);
          } else {
            strapi.log.info(`[Articles FindOne] User ${userId} tried to view draft article ${id} (author: ${authorId})`);
          }
        }
      }
    } else {
      entity = await entityService.findOne('api::article.article' as any, id, {
        ...query,
        populate,
        publicationState: 'preview',
      });
    }

    if (!entity) {
      return ctx.notFound('Article not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  async create(ctx: any) {
    const { data } = ctx.request.body || {};
    const query = ctx.query || {};
    const user = ctx.state.user;
    const entityService = strapi.entityService;

    if (!user) {
      return ctx.unauthorized('You must be authenticated');
    }

    const isEditor = user.role?.type === 'editor';
    if (!isEditor && !data.author) {
      data.author = user.id;
    }

    if (data.publishedAt) {
      delete data.publishedAt;
    }

    const entity = await entityService.create('api::article.article' as any, {
      data,
      ...query,
      populate: query.populate || ['category', 'author', 'coverImage'],
    });

    strapi.log.info(`Article created by user ${user.id}`);

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  async update(ctx: any) {
    const { id } = ctx.params;
    const { data } = ctx.request.body || {};
    const query = ctx.query || {};
    const user = ctx.state.user;
    const entityService = strapi.entityService;

    if (!user) {
      return ctx.unauthorized('You must be authenticated');
    }

    const article: any = await entityService.findOne('api::article.article' as any, id, {
      populate: ['author'],
    });

    if (!article) {
      return ctx.notFound('Article not found');
    }

    const isEditor = user.role?.type === 'editor';
    const authorId = Number(article.author?.id);
    const userId = Number(user.id);
    const isAuthor = authorId === userId;

    strapi.log.info(`Update check: user ${userId}, author ${authorId}, isEditor: ${isEditor}, isAuthor: ${isAuthor}`);

    if (!isEditor && !isAuthor) {
      return ctx.forbidden('You can only update your own articles or be an editor');
    }

    if (data.publishedAt !== undefined) {
      delete data.publishedAt;
    }

    const entity = await entityService.update('api::article.article' as any, id, {
      data,
      ...query,
      populate: query.populate || ['category', 'author', 'coverImage'],
    });

    if (!entity) {
      return ctx.notFound('Article not found');
    }

    strapi.log.info(`Article ${id} updated by user ${user.id}`);

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  async featured(ctx: any) {
    try {
      const { query } = ctx;
      
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
        },
        populate,
        sort: query.sort || { createdAt: 'desc' },
        publicationState: 'live',
      });

      const sanitizedEntities = await this.sanitizeOutput(entities, ctx);
      return this.transformResponse(sanitizedEntities);
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  async publish(ctx: any) {
    try {
      const { id } = ctx.params;
      const user = ctx.state.user;

      if (!user || user.role?.type !== 'editor') {
        return ctx.unauthorized('Only editors can publish articles');
      }

      const article = await strapi.entityService.findOne('api::article.article' as any, id, {
        populate: ['author'],
        publicationState: 'preview',
      });

      if (!article) {
        return ctx.notFound('Article not found');
      }

      const documentService = strapi.documents('api::article.article');
      const documentId = article.documentId || id;
      
      await documentService.publish({
        documentId: documentId,
      } as any);

      const updatedArticle = await strapi.entityService.findOne('api::article.article' as any, id, {
        populate: ['category', 'author', 'coverImage'],
        publicationState: 'live',
      });

      if (!updatedArticle) {
        return ctx.notFound('Article not found after publish');
      }

      strapi.log.info(`Article ${id} (documentId: ${documentId}) published by user ${user.id}`);

      const sanitizedEntity = await this.sanitizeOutput(updatedArticle, ctx);
      return this.transformResponse(sanitizedEntity);
    } catch (err) {
      strapi.log.error('Publish error:', err);
      ctx.throw(500, err);
    }
  },

  async incrementViews(ctx: any) {
    try {
      const { id } = ctx.params;
      
      const article: any = await strapi.entityService.findOne('api::article.article' as any, id, {
        fields: ['views', 'publishedAt'],
        publicationState: 'live',
      });

      if (!article) {
        return ctx.notFound('Article not found');
      }


      const newViews = (article.views || 0) + 1;

      // Используем прямой SQL запрос для обновления только views
      // В SQL мы явно сохраняем текущее значение updated_at (updated_at = updated_at)
      // Это предотвращает автоматическое обновление updated_at триггерами БД или Strapi
      const metadata = strapi.db.metadata.get('api::article.article');
      const tableName = metadata.tableName;
      
      // Получаем Knex connection из Strapi
      const knex = strapi.db.connection;
      
      // Выполняем raw SQL запрос, который обновляет только views
      // В SQL мы явно сохраняем текущее значение updated_at (updated_at = updated_at)
      // Это предотвращает автоматическое обновление updated_at триггерами БД или Strapi
      try {
        await knex.raw(
          `UPDATE ?? SET views = ?, updated_at = updated_at WHERE id = ?`,
          [tableName, newViews, id]
        );
        strapi.log.info(`[Article Controller] Views updated for article ${id}: ${newViews}`);
      } catch (sqlError: any) {
        strapi.log.error(`[Article Controller] SQL update failed, trying entityService:`, sqlError.message);
        // Fallback: используем entityService, но затем восстанавливаем updatedAt
        const currentUpdatedAt = article.updatedAt || new Date();
        await strapi.entityService.update('api::article.article' as any, id, {
          data: { views: newViews },
          publicationState: 'live',
        });
        // Восстанавливаем updatedAt
        await knex(tableName).where({ id }).update({ updated_at: currentUpdatedAt });
      }

      return ctx.send({ views: newViews });
    } catch (err: any) {
      strapi.log.error('[Article Controller] Error incrementing views:', err);
      return ctx.send({ views: 0 });
    }
  },

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

      const isEditor = user.role?.type === 'editor';
      const authorId = Number(article.author?.id);
      const userId = Number(user.id);
      const isAuthor = authorId === userId;

      strapi.log.info(`Delete check: user ${userId}, author ${authorId}, isEditor: ${isEditor}, isAuthor: ${isAuthor}`);

      if (!isEditor && !isAuthor) {
        return ctx.forbidden('You can only delete your own articles or be an editor');
      }

      const deletedArticle = await strapi.entityService.delete('api::article.article' as any, id);

      strapi.log.info(`Article ${id} deleted by user ${user.id}`);

      const sanitizedEntity = await this.sanitizeOutput(deletedArticle, ctx);
      return this.transformResponse(sanitizedEntity);
    } catch (err) {
      ctx.throw(500, err);
    }
  },
}));
