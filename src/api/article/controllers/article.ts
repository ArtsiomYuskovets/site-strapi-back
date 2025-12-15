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
    
    const filters: any = { ...query.filters };
    
    try {
      if (!isEditor) {
        const documentService = strapi.documents('api::article.article');
        
        const documents: any = await documentService.findMany({
          filters: filters,
          sort: query.sort,
          pagination: query.pagination,
          status: 'published',
          populate,
        } as any);
        
        if (Array.isArray(documents)) {
          const sanitizedEntities = await this.sanitizeOutput(documents, ctx);
          return this.transformResponse(sanitizedEntities);
        } else {
          const { data, meta } = documents;
          
          if (data && data.length > 0) {
            const entities = [];
            for (const doc of data) {
              if (doc && (doc.id || doc.documentId)) {
                if (doc.author || doc.category || doc.coverImage) {
                  entities.push(doc);
                } else {
                  const docId = doc.id || doc.documentId;
                  try {
                    const entity = await entityService.findOne('api::article.article' as any, docId, {
                      populate,
                      publicationState: 'live',
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
            
            const sanitizedEntities = await this.sanitizeOutput(entities, ctx);
            return this.transformResponse(sanitizedEntities, meta);
          }
          
          const sanitizedEntities = await this.sanitizeOutput(data || [], ctx);
          return this.transformResponse(sanitizedEntities, meta);
        }
      } else {
        const documentService = strapi.documents('api::article.article');
        
        const allDocuments: any = await documentService.findMany({
          filters: filters,
          sort: query.sort,
          pagination: query.pagination,
          populate,
        } as any);
        
        if (Array.isArray(allDocuments)) {
          const sanitizedEntities = await this.sanitizeOutput(allDocuments, ctx);
          return this.transformResponse(sanitizedEntities);
        } else {
          const { data, meta } = allDocuments;
          
          if (data && data.length > 0) {
            const entities = [];
            for (const doc of data) {
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
            
            const sanitizedEntities = await this.sanitizeOutput(entities, ctx);
            return this.transformResponse(sanitizedEntities, meta);
          }
          
          const sanitizedEntities = await this.sanitizeOutput(data || [], ctx);
          return this.transformResponse(sanitizedEntities, meta);
        }
      }
    } catch (err: any) {
      strapi.log.error(`[Articles Find] Error: ${err.message}`);
      
      const findOptions: any = {
        populate,
        filters,
        sort: query.sort,
        pagination: query.pagination,
        publicationState: isEditor ? 'preview' : 'live',
      };
      
      const result = await entityService.findMany('api::article.article' as any, findOptions);
      
      if (Array.isArray(result)) {
        const sanitizedEntities = await this.sanitizeOutput(result, ctx);
        return this.transformResponse(sanitizedEntities);
      } else {
        const { data, meta } = result;
        const sanitizedEntities = await this.sanitizeOutput(data, ctx);
        return this.transformResponse(sanitizedEntities, meta);
      }
    }
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

    if (strapi.service('api::audit-log.audit-log')) {
      try {
        await strapi.service('api::audit-log.audit-log').logAction({
          action: 'create',
          entityType: 'article',
          entityId: entity.id,
          entityTitle: entity.title,
          user,
          ctx,
        });
      } catch (err) {
        strapi.log.error('[Article Controller] Error logging create action:', err);
      }
    }

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

    if (strapi.service('api::audit-log.audit-log')) {
      try {
        await strapi.service('api::audit-log.audit-log').logAction({
          action: 'update',
          entityType: 'article',
          entityId: id,
          entityTitle: entity.title,
          user,
          ctx,
        });
      } catch (err) {
        strapi.log.error('[Article Controller] Error logging update action:', err);
      }
    }

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

      if (strapi.service('api::audit-log.audit-log')) {
        try {
          await strapi.service('api::audit-log.audit-log').logAction({
            action: 'publish',
            entityType: 'article',
            entityId: id,
            entityTitle: updatedArticle.title,
            user,
            ctx,
          });
        } catch (err) {
          strapi.log.error('[Article Controller] Error logging publish action:', err);
        }
      }

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

      const metadata = strapi.db.metadata.get('api::article.article');
      const tableName = metadata.tableName;
      
      const knex = strapi.db.connection;
      
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

      const articleTitle = article.title;

      const deletedArticle = await strapi.entityService.delete('api::article.article' as any, id);

      strapi.log.info(`Article ${id} deleted by user ${user.id}`);

      if (strapi.service('api::audit-log.audit-log')) {
        try {
          await strapi.service('api::audit-log.audit-log').logAction({
            action: 'delete',
            entityType: 'article',
            entityId: id,
            entityTitle: articleTitle,
            user,
            ctx,
          });
        } catch (err) {
          strapi.log.error('[Article Controller] Error logging delete action:', err);
        }
      }

      const sanitizedEntity = await this.sanitizeOutput(deletedArticle, ctx);
      return this.transformResponse(sanitizedEntity);
    } catch (err) {
      ctx.throw(500, err);
    }
  },
}));
