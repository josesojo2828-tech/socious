export const SubscriptionPlanEndpoints = {
  // Mapeo del método @Get('form/:type')
  form: {
    // case 'create'
    create: '/api/subscription/form/create',

    // case 'update' -> requiere query param ?id=
    update: (id: string) => `/api/subscription/form/update?id=${id}`,

    // case 'add' -> requiere query param ?id= (detectado en tu lógica del controller)
    addFeatures: (id: string) => `/api/subscription/form/add?id=${id}`,
  },

  data: {
    list: '/api/subscription',
    unique: (id: string) => `/api/subscription/${id}`,
  },

  // Mapeo de los métodos @Post
  actions: {
    // @Post('/create')
    create: '/api/subscription/create',

    // @Post('/:id/update')
    update: (id: string) => `/api/subscription/${id}/update`,

    // @Post('/:id/delete')
    delete: (id: string) => `/api/subscription/${id}/delete`,

    // @Post('add/content/:id')
    addContent: (id: string) => `/api/subscription/add/content/${id}`,

    // @Post('remove/content/:id')
    removeContent: (id: string) => `/api/subscription/remove/content/${id}`,

    // @Get('autorenew') - Aunque es GET, actúa como una acción de sistema
    triggerAutoRenew: '/api/subscription/autorenew',
  },

  // Workspace/Organization Subscription Endpoints
  workspaceSubscription: (orgId: string) => `/api/organizations/${orgId}/subscription`,
  workspaceSubscriptionStatus: (orgId: string) => `/api/organizations/${orgId}/subscription-status`,
  createWorkspaceSubscription: (orgId: string) => `/api/organizations/${orgId}/subscription`,

  // Sección Analytics (Estaba comentada en tu controller, la dejo preparada)
  stat: {
    // analytics: '/api/subscription/analytics',
  }
};