import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::audit-log.audit-log' as any, ({ strapi }) => ({
  async find(ctx: any) {
    const user = ctx.state.user;
    
    if (!user || user.role?.type !== 'editor') {
      return ctx.unauthorized('Only editors can view audit logs');
    }

    const query = ctx.query || {};
    
    const entities = await strapi.entityService.findMany('api::audit-log.audit-log' as any, {
      ...query,
      sort: query.sort || { createdAt: 'desc' },
      populate: query.populate || ['user'],
    });

    const sanitizedEntities = await this.sanitizeOutput(entities, ctx);
    return this.transformResponse(sanitizedEntities);
  },

  async findOne(ctx: any) {
    const user = ctx.state.user;
    
    if (!user || user.role?.type !== 'editor') {
      return ctx.unauthorized('Only editors can view audit logs');
    }

    const { id } = ctx.params;
    const query = ctx.query || {};

    const entity = await strapi.entityService.findOne('api::audit-log.audit-log' as any, id, {
      ...query,
      populate: query.populate || ['user'],
    });

    if (!entity) {
      return ctx.notFound('Audit log not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },
}));

