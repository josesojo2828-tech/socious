// src/auth/strategies/rt.strategy.ts
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { FastifyRequest } from "fastify";
import { ForbiddenException, Injectable } from "@nestjs/common"; // <--- Asegúrate de importar ForbiddenException
import { ConfigService } from "@nestjs/config";

@Injectable()
export class RtStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(config: ConfigService) {
    const secret = config.get<string>("RT_SECRET");
    if (!secret) {
      throw new Error("RT_SECRET environment variable is not set");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  validate(req: FastifyRequest, payload: any) {
    const refreshToken = req.headers.authorization?.replace("Bearer", "").trim();
    if (!refreshToken) throw new ForbiddenException("Refresh token malformed");

    return { ...payload, refreshToken };
  }
}
