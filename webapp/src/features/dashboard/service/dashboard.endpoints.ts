
export const DashboardEndpoints = {
  ui: {
    sidebar: '/api/dashboard/sidebar',
    tabs: '/api/dashboard/tabs',
  },
  api: {
    stats: '/api/dashboard/stats',
    users: '/api/dashboard/users/api/list',
    userDetail: '/api/dashboard/users',
    subscriptions: '/api/dashboard/users/subscriptions/api/list',
    transactions: '/api/dashboard/transactions/api/list',
    feedback: '/api/dashboard/users/feedback/api/list',
    paymentMethods: '/api/dashboard/users/payment-methods/api/list',
    permits: '/api/dashboard/permits/api/list',
    wallets: '/api/dashboard/wallets/api/list',
    systemPaymentMethods: '/api/payment-methods',
    cms: '/api/cms',
    activity: {
      feed: '/api/dashboard/activity/feed',
      stats: '/api/dashboard/activity/stats',
    },
    adoption: {
      activeUsers: '/api/dashboard/adoption/active-users',
      dormant: '/api/dashboard/adoption/dormant',
      cohorts: '/api/dashboard/adoption/cohorts',
      funnel: '/api/dashboard/adoption/funnel',
      depth: '/api/dashboard/adoption/depth',
    },
    locations: '/api/dashboard/locations',
  },
  permit: {
    permissions: '/api/permit/permissions',
    base: '/api/permit',
  },
};

