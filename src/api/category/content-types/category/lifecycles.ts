import slugify from 'slugify';

function generateSlug(name: string): string {
  return slugify(name, {
    lower: true,
    strict: true,
    locale: 'ru',
  });
}

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;

    if (data.name && !data.slug) {
      data.slug = generateSlug(data.name);
    }
  },

  async beforeUpdate(event: any) {
    const { data, where } = event.params;

    if (data.name) {
      const existingCategory: any = await strapi.entityService.findOne(
        'api::category.category' as any,
        where.id,
        { fields: ['name', 'slug'] }
      );

      if (existingCategory && existingCategory.name !== data.name) {
        data.slug = generateSlug(data.name);
      } else if (!existingCategory?.slug) {
        data.slug = generateSlug(data.name);
      }
    }
  },
};

