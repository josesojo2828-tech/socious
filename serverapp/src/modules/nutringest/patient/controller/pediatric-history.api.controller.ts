import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import type { RequestWithUser } from "src/shared/types/server.type";
import { PediatricHistoryService } from "../service/pediatric-history.service";
import { InfantFormulaService } from "../service/infant-formula.service";
import {
  CreatePediatricHistoryDto,
  UpdatePediatricHistoryDto,
} from "../dto/pediatric-history.dto";
import {
  CreateInfantFormulaDto,
  UpdateInfantFormulaDto,
} from "../dto/infant-formula.dto";

@Controller("api/pediatric-history")
@UseGuards(SessionAuthGuard)
export class PediatricHistoryApiController {
  constructor(
    private readonly pediatricHistoryService: PediatricHistoryService,
    private readonly infantFormulaService: InfantFormulaService,
  ) {}

  @Get("")
  async index(
    @Req() req: RequestWithUser,
    @Query() query: { patientId?: string },
  ) {
    return this.pediatricHistoryService.getLastActive({
      patientId: query.patientId,
      userSession: req.user,
    });
  }

  @Get("/patient/:patientId")
  async getByPatientId(
    @Param("patientId") patientId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.pediatricHistoryService.getLastActive({
      patientId,
      userSession: req.user,
    });
  }

  @Post("/create/api")
  async create(
    @Body() body: CreatePediatricHistoryDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.pediatricHistoryService.create({
      data: body,
      userSession: req.user,
    });
    return { message: "Historia pediátrica registrada correctamente.", entity };
  }

  @Post("/:id/update/api")
  async update(
    @Param("id") id: string,
    @Body() body: UpdatePediatricHistoryDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.pediatricHistoryService.update({
      id,
      data: body,
      userSession: req.user,
    });
    return { message: "Historia pediátrica actualizada.", entity };
  }

  @Post("/:id/delete/api")
  async delete(@Param("id") id: string, @Req() req: RequestWithUser) {
    const entity = await this.pediatricHistoryService.softDelete({
      id,
      userSession: req.user,
    });
    return { message: "Registro eliminado.", entity };
  }

  // --- FÓRMULAS LÁCTEAS (InfantFormulaHistory) ---
  @Get("/:id/infant-formulas")
  async listFormulas(
    @Param("id") pediatricHistoryId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.infantFormulaService.list({
      pediatricHistoryId,
      userSession: req.user,
    });
  }

  @Post("/:id/infant-formulas/create/api")
  async createFormula(
    @Param("id") pediatricHistoryId: string,
    @Body() body: CreateInfantFormulaDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.infantFormulaService.create({
      pediatricHistoryId,
      data: body,
      userSession: req.user,
    });
    return { message: "Fórmula láctea registrada correctamente.", entity };
  }

  @Post("/infant-formulas/:fid/update/api")
  async updateFormula(
    @Param("fid") fid: string,
    @Body() body: UpdateInfantFormulaDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.infantFormulaService.update({
      id: fid,
      data: body,
      userSession: req.user,
    });
    return { message: "Fórmula láctea actualizada.", entity };
  }

  @Post("/infant-formulas/:fid/delete/api")
  async deleteFormula(@Param("fid") fid: string, @Req() req: RequestWithUser) {
    const entity = await this.infantFormulaService.softDelete({
      id: fid,
      userSession: req.user,
    });
    return { message: "Fórmula láctea eliminada.", entity };
  }
}