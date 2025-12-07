import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::category.category' as any, ({ strapi }) => ({
  /**
   * Standard find method
   */
  async find(ctx: any) {
    const query = ctx.query || {};
    const entityService = strapi.entityService;
    
    // Parse populate parameter - can be string or array
    let populate = ['articles'];
    if (query.populate) {
      if (typeof query.populate === 'string') {
        // Handle both 'articles' and '*' (populate all)
        if (query.populate === '*') {
          populate = ['articles'];
        } else {
          populate = query.populate.split(',').map((p: string) => p.trim());
        }
      } else if (Array.isArray(query.populate)) {
        populate = query.populate;
      }
    }
    
    const entities = await entityService.findMany('api::category.category' as any, {
      ...query,
      populate,
    });

    const sanitizedEntities = await this.sanitizeOutput(entities, ctx);
    return this.transformResponse(sanitizedEntities);
  },

  /**
   * Standard findOne method
   */
  async findOne(ctx: any) {
    const { id } = ctx.params;
    const query = ctx.query || {};
    const entityService = strapi.entityService;

    // Parse populate parameter - can be string or array
    let populate = ['articles'];
    if (query.populate) {
      if (typeof query.populate === 'string') {
        // Handle both 'articles' and '*' (populate all)
        if (query.populate === '*') {
          populate = ['articles'];
        } else {
          populate = query.populate.split(',').map((p: string) => p.trim());
        }
      } else if (Array.isArray(query.populate)) {
        populate = query.populate;
      }
    }

    const entity = await entityService.findOne('api::category.category' as any, id, {
      ...query,
      populate,
    });

    if (!entity) {
      return ctx.notFound('Category not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Standard create method
   */
  async create(ctx: any) {
    const { data } = ctx.request.body || {};
    const query = ctx.query || {};
    const entityService = strapi.entityService;

    const entity = await entityService.create('api::category.category' as any, {
      data,
      ...query,
      populate: query.populate || ['articles'],
    });

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Standard update method
   */
  async update(ctx: any) {
    const { id } = ctx.params;
    const { data } = ctx.request.body || {};
    const query = ctx.query || {};
    const entityService = strapi.entityService;

    const entity = await entityService.update('api::category.category' as any, id, {
      data,
      ...query,
      populate: query.populate || ['articles'],
    });

    if (!entity) {
      return ctx.notFound('Category not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Standard delete method
   */
  async delete(ctx: any) {
    const { id } = ctx.params;
    const entityService = strapi.entityService;

    const entity = await entityService.delete('api::category.category' as any, id);

    if (!entity) {
      return ctx.notFound('Category not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },
}));

