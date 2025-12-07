export default (policyContext: any, config: any, { strapi }: any) => {
  const { user } = policyContext.state;

  if (!user) {
    return false;
  }

  return user.role?.type === 'editor';
};






