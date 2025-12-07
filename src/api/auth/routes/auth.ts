export default {
  routes: [
    {
      method: 'GET',
      path: '/auth/me',
      handler: 'auth.me',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
  ],
};

