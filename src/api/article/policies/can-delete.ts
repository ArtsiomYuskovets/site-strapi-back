export default (policyContext: any, config: any, { strapi }: any) => {
  const { user } = policyContext.state;

  if (!user) {
    return false;
  }

  if (user.role?.type === 'editor') {
    return true;
  }
  const articleId = policyContext.params.id;
  
  return strapi.entityService
    .findOne('api::article.article' as any, articleId, {
      populate: ['author'],
    })
    .then((article: any) => {
      if (!article) {
        return false;
      }
      return article.author?.id === user.id;
    })
    .catch(() => false);
};

