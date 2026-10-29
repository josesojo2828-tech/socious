export type JwtPayload = {
  email: string;
  sub: number; // ID del usuario
};

export type Tokens = {
  access_token: string;
  refresh_token: string;
};
