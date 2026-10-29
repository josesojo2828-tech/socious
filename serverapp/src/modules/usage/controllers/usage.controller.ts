import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { SessionAuthGuard } from '../../auth/guards/authenticated.guard';
import { Public } from '../../../shared/decorators/public.decorator';
import { RequestWithUser } from '../../../shared/types/server.type';
import { UsageService } from '../services/usage.service';
import { CreateCalculatorUsageDto } from '../dto/create-calculator-usage.dto';

@Controller('api/usage')
@UseGuards(SessionAuthGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Post('calculator')
  @Public()
  async logCalculatorUsage(
    @Body() dto: CreateCalculatorUsageDto,
    @Req() req: RequestWithUser,
  ) {
    await this.usageService.logUsage(
      dto,
      req.user?.id,
      req.ip,
      req.headers['user-agent'],
    );
    return { ok: true };
  }

  @Get('calculator/stats')
  async getCalculatorStats(@Req() req: RequestWithUser) {
    const isAdmin =
      req.user?.permits?.name === 'SUPERADMIN' ||
      req.user?.permits?.name === 'ADMIN' ||
      req.user?.permits?.list?.includes('USER_LIST') ||
      req.user?.permits?.list?.includes('PERMIT_DASHBOARD');

    if (!isAdmin) {
      throw new ForbiddenException('Acceso denegado');
    }

    return this.usageService.getStats();
  }
}