import { Controller, Get, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import { InstitutionalFoodGuard } from "../guard/institutional-food.guard";
import { InstitutionalFoodService } from "../service/institutional-food.service";

@Controller("api/sport-disciplines")
@UseGuards(SessionAuthGuard, InstitutionalFoodGuard)
export class SportDisciplineController {
  constructor(private readonly institutionalService: InstitutionalFoodService) {}

  @Get("")
  async listActiveDisciplines() {
    return this.institutionalService.findAllSportDisciplines();
  }
}