export default {
  async me(ctx: any) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You must be authenticated');
    }

    try {
      const userWithRole = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
        populate: ['role'],
      });

      if (!userWithRole) {
        return ctx.notFound('User not found');
      }

      const sanitizedUser = await strapi.plugin('users-permissions').service('user').sanitizeOutput(userWithRole, ctx);

      strapi.log.info(`[Auth Controller] User ${user.id} requested their info, role: ${sanitizedUser.role?.type || 'none'}`);

      return sanitizedUser;
    } catch (err: any) {
      strapi.log.error('[Auth Controller] Error in me:', err);
      ctx.throw(500, err);
    }
  },
};

