import { Module } from '@nestjs/common';
import { CampusService } from './campus.service';
import { CampusController } from './campus.controller';
import { FileModule } from '../file/file.module';
import { UserModule } from '../user/user.module';
import { UniversityModule } from './university/university.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [FileModule, UserModule, UniversityModule],
  controllers: [CampusController],
  providers: [CampusService, JwtService],
  exports: [CampusService],
})
export class CampusModule {}
