import { forwardRef, Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { SocialFeedService } from './social-feed.service';
import { PrismaService } from 'nestjs-prisma';
import { JwtService } from '@nestjs/jwt';
import { PermitModule } from 'src/modules/permit/permit.module';
import { MenuModule } from 'src/modules/nutringest/menu/menu.module';
import { ExchangeListModule } from 'src/modules/nutringest/exchange-list/exchange-list.module';
import { UserModule } from 'src/modules/user/user.module';

@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => MenuModule),
    forwardRef(() => ExchangeListModule),
    forwardRef(() => UserModule),
  ],
  controllers: [CommunityController],
  providers: [CommunityService, SocialFeedService, PrismaService, JwtService],
  exports: [CommunityService, SocialFeedService],
})
export class CommunityModule {}
