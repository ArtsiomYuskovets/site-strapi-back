export default {
  routes: [
    {
      method: 'GET',
      path: '/audit-logs',
      handler: 'audit-log.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/audit-logs/:id',
      handler: 'audit-log.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

