export default (config: any, { strapi }: any) => {
  return async (ctx: any, next: any) => {
    await next()
  }
}

