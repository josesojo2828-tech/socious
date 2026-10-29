import { Controller, Get, Query } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { Public } from 'src/shared/decorators/public.decorator';

@Public()
@Controller('api/exchange')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Get('rates')
  async getRates() {
    return this.exchangeService.getRates();
  }

  @Get('convert')
  async convert(
    @Query('amount') amount: string,
    @Query('from') from: 'USD' | 'VES',
    @Query('to') to: 'USD' | 'VES',
  ) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return { error: 'Invalid amount' };
    }
    return this.exchangeService.convert(numAmount, from || 'USD', to || 'VES');
  }

  @Get('bcv')
  async getBcvRate() {
    const rate = await this.exchangeService.getBcvRate();
    return { rate, currency: 'USD/VES' };
  }
}
