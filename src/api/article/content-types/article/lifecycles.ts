// @ts-ignore
import slugify from 'slugify';

/**
 * Calculate reading time in minutes based on content
 * Assumes average reading speed of 200 words per minute
 */
function calculateReadingTime(content: string): number {
  if (!content) return 0;
  
  // Remove HTML tags and get plain text
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  
  return Math.ceil(wordCount / 200);
}

/**
 * Generate slug from title
 */
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

    // Auto-generate slug from title if not provided
    if (data.title && !data.slug) {
      data.slug = generateSlug(data.title);
    }

    // Calculate reading time from content
    if (data.content) {
      data.readingTime = calculateReadingTime(data.content);
    }

    // Set default values
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

    // Auto-generate slug from title if title changed
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

    // Recalculate reading time if content changed
    if (data.content) {
      data.readingTime = calculateReadingTime(data.content);
    }
  },

  async afterCreate(event: any) {
    const { result } = event;
    
    // Log article creation
    strapi.log.info(`Article created: ${result.id} - ${result.title}`);
  },

  async afterUpdate(event: any) {
    const { result } = event;
    
    // Log article update
    strapi.log.info(`Article updated: ${result.id} - ${result.title}`);
  },

  async afterDelete(event: any) {
    const { result } = event;
    
    // Log article deletion
    strapi.log.info(`Article deleted: ${result.id} - ${result.title}`);
  },
};

