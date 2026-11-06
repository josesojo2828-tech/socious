import { Module } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { TutorialController } from "./tutorial.controller";
import { TutorialService } from "./tutorial.service";

@Module({
  controllers: [TutorialController],
  providers: [TutorialService, JwtService],
  exports: [TutorialService],
})
export class TutorialModule {}
