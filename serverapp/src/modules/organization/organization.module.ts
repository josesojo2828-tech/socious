import { Module, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { UserModule } from 'src/modules/user/user.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [UserModule, forwardRef(() => NotificationModule)],
  controllers: [OrganizationController],
  providers: [OrganizationService, JwtService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
