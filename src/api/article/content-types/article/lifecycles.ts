import slugify from 'slugify';

function calculateReadingTime(content: string): number {
  if (!content) return 0;
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  
  return Math.ceil(wordCount / 200);
}

function generateSlug(title: string): string {
  return slugify(title, {
    lower: true,
    strict: true,
    locale: 'ru',
  });
}

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;

    if (data.title && !data.slug) {
      data.slug = generateSlug(data.title);
    }

    if (data.content) {
      data.readingTime = calculateReadingTime(data.content);
    }

    if (data.views === undefined) {
      data.views = 0;
    }
    if (data.isFeatured === undefined) {
      data.isFeatured = false;
    }
    if (!data.tags) {
      data.tags = [];
    }
  },

  async beforeUpdate(event: any) {
    const { data, where } = event.params;

    if (data.title) {
      const existingArticle = await strapi.entityService.findOne(
        'api::article.article',
        where.id,
        { fields: ['title', 'slug'] }
      );

      if (existingArticle && existingArticle.title !== data.title) {
        data.slug = generateSlug(data.title);
      } else if (!existingArticle?.slug) {
        data.slug = generateSlug(data.title);
      }
    }

    if (data.content) {
      data.readingTime = calculateReadingTime(data.content);
    }
  },

  async afterCreate(event: any) {
    const { result } = event;
    const user = event.state?.user || null;
    
    strapi.log.info(`Article created: ${result.id} - ${result.title}`);
    
    if (strapi.service('api::audit-log.audit-log') && user) {
      try {
        await strapi.service('api::audit-log.audit-log').logAction({
          action: 'create',
          entityType: 'article',
          entityId: result.id,
          entityTitle: result.title,
          user,
          ctx: event.state?.ctx,
        });
      } catch (err) {
        strapi.log.error('[Article Lifecycle] Error logging create action:', err);
      }
    }
  },

  async afterUpdate(event: any) {
    const { result } = event;
    const user = event.state?.user || null;
    
    strapi.log.info(`Article updated: ${result.id} - ${result.title}`);
    
    if (strapi.service('api::audit-log.audit-log') && user) {
      try {
        await strapi.service('api::audit-log.audit-log').logAction({
          action: 'update',
          entityType: 'article',
          entityId: result.id,
          entityTitle: result.title,
          user,
          ctx: event.state?.ctx,
        });
      } catch (err) {
        strapi.log.error('[Article Lifecycle] Error logging update action:', err);
      }
    }
  },

  async afterDelete(event: any) {
    const { result } = event;
    const user = event.state?.user || null;
    
    strapi.log.info(`Article deleted: ${result.id} - ${result.title}`);
    
    if (strapi.service('api::audit-log.audit-log') && user) {
      try {
        await strapi.service('api::audit-log.audit-log').logAction({
          action: 'delete',
          entityType: 'article',
          entityId: result.id,
          entityTitle: result.title,
          user,
          ctx: event.state?.ctx,
        });
      } catch (err) {
        strapi.log.error('[Article Lifecycle] Error logging delete action:', err);
      }
    }
  },
};

