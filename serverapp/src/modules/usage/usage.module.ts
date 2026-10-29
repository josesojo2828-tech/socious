import { Module, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsageController } from './controllers/usage.controller';
import { UsageService } from './services/usage.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [forwardRef(() => UserModule)],
  controllers: [UsageController],
  providers: [UsageService, JwtService],
  exports: [UsageService],
})
export class UsageModule {}