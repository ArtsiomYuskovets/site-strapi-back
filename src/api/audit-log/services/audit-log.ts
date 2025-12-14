export default ({ strapi }) => ({
  async logAction({
    action,
    entityType,
    entityId,
    entityTitle,
    user,
    changes,
    ctx,
  }: {
    action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish';
    entityType: string;
    entityId: number;
    entityTitle?: string;
    user: any;
    changes?: any;
    ctx?: any;
  }) {
    try {
      const ipAddress = ctx?.request?.ip || ctx?.request?.headers?.['x-forwarded-for'] || ctx?.request?.socket?.remoteAddress || 'unknown';
      const userAgent = ctx?.request?.headers?.['user-agent'] || 'unknown';

      await strapi.entityService.create('api::audit-log.audit-log', {
        data: {
          action,
          entityType,
          entityId,
          entityTitle: entityTitle || null,
          user: user?.id || null,
          userId: user?.id || null,
          userEmail: user?.email || null,
          userRole: user?.role?.type || user?.role?.name || null,
          changes: changes || null,
          ipAddress,
          userAgent,
        },
      });

      strapi.log.info(`[Audit Log] ${action} ${entityType} ${entityId} by user ${user?.id || 'unknown'}`);
    } catch (error) {
      strapi.log.error('[Audit Log] Error logging action:', error);
    }
  },
});

