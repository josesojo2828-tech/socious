import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import {
  LoginAuthDto,
  RegisterAuthDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from "./dto/login-auth.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { AuthGuard } from "@nestjs/passport";
import type { RequestWithUser } from "src/shared/types/server.type";
import { Public } from "src/shared/decorators/public.decorator";
import { ThrottlerGuard } from "@nestjs/throttler";

@Controller("api/auth")
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @Public()
  @HttpCode(HttpStatus.OK)
  signinLocal(@Body() dto: LoginAuthDto, @Req() req: any) {
    const ip = req.ip || req.headers["x-forwarded-for"] || "Desconocida";
    const userAgent = req.headers["user-agent"] || "Navegador Web";
    return this.authService.signinLocal(dto, { ip: String(ip), userAgent });
  }

  @Post("register")
  @Public()
  @HttpCode(HttpStatus.OK)
  registerLocal(@Body() dto: RegisterAuthDto, @Req() req: any) {
    const ip = req.ip || req.headers["x-forwarded-for"] || "Desconocida";
    return this.authService.registerLocal(dto, { ip: String(ip) });
  }

  @Post("verify-email")
  @Public()
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post("forgot-password")
  @Public()
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post("reset-password")
  @Public()
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(
      dto.code,
      dto.password,
      dto.confirmPassword,
    );
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: RequestWithUser) {
    const user = req.user as any;
    return this.authService.logout(user["sub"]);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: RequestWithUser,
  ) {
    return this.authService.changePassword(
      (req.user as unknown as { sub: string }).sub,
      dto.oldPassword,
      dto.newPassword,
    );
  }

  @Public()
  @UseGuards(AuthGuard("jwt-refresh"))
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refreshTokens(@Req() req: RequestWithUser) {
    const user = req.user as any;
    return this.authService.refreshTokens(user["sub"], user["refreshToken"]);
  }
}
