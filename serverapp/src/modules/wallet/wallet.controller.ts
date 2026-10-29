import { Controller, Get, Post, Body, Param, Query, UseGuards, NotFoundException, ForbiddenException, BadRequestException, Req } from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import WalletRepository from "./repository/wallet.repository";
import type { RequestWithUser } from "src/shared/types/server.type";

@Controller("api/wallet")
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly walletRepository: WalletRepository,
  ) {}

  @Get("balance")
  @UseGuards(SessionAuthGuard)
  async getBalance(@Req() req: RequestWithUser) {
    return this.walletService.getBalanceWithConversion(req.user.id);
  }

  @Get("form/:type")
  @UseGuards(SessionAuthGuard)
  private async form(
    @Query() query: { id?: string; lang?: string },
    @Param() param: { type: string },
  ) {
    const effectiveLang = query.lang || "es";

    if (param.type === "update") {
      if (!query.id) throw new NotFoundException("ID de billetera no especificado");
      const object = await this.walletService.findOneById(query.id);
      if (!object) throw new NotFoundException("Billetera no encontrada");

      const formStructure = this.walletRepository.getFormUpdateWallet({
        object,
      });
      return this.walletService.translateForm(formStructure, effectiveLang);
    } else {
      throw new NotFoundException("Tipo de formulario no válido");
    }
  }

  @Post("/:id/update")
  @UseGuards(SessionAuthGuard)
  private async update(
    @Param() param: { id: string },
    @Body() body: { balance: number },
    @Req() req: RequestWithUser,
  ) {
    const isAdmin =
      req.user?.permits?.name === "SUPERADMIN" ||
      req.user?.permits?.name === "ADMIN";

    if (!isAdmin) {
      throw new ForbiddenException("No autorizado para modificar billeteras");
    }

    const balanceVal = Number(body.balance);
    if (isNaN(balanceVal) || balanceVal < 0) {
      throw new BadRequestException(
        "El balance debe ser un número válido mayor o igual a 0",
      );
    }

    return await this.walletService.updateWallet(
      param.id,
      balanceVal,
      req.user?.id,
    );
  }
}
