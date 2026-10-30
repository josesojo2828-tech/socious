import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";
import { JwtService } from "@nestjs/jwt";
import { forwardRef, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ExchangeService } from './exchange.service';
import { ExchangeController } from './exchange.controller';

@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => UserModule),
HttpModule],
  controllers: [ExchangeController],
  providers: [ExchangeService,
    JwtService,
  ],
  exports: [ExchangeService],
})
export class ExchangeModule {}
