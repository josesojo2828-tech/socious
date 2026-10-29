const BASE = "/api/portfolio";

export const PortfolioEndpoints = {
  base: BASE,
  actions: {
    public: (username: string) => `${BASE}/public/@${username}`,
    track: (username: string) => `${BASE}/public/@${username}/track`,
    book: (username: string) => `${BASE}/public/@${username}/book`,
    me: `${BASE}/me`,
    update: `${BASE}/update`,
    analytics: (days: number = 30) => `${BASE}/analytics?days=${days}`,
    validate: (username: string) => `${BASE}/validate-username/${username}`,
  },
};

