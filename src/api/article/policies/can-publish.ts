export default (policyContext: any, config: any, { strapi }: any) => {
  const { user } = policyContext.state;

  if (!user) {
    return false;
  }

  // Only editors can publish articles
  return user.role?.type === 'editor';
};






