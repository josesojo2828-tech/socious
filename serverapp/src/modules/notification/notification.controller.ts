import {
  Controller,
  Get,
  Param,
  Req,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { NotificationService } from "./service/notification.service";
import type { RequestWithUser } from "src/shared/types/server.type";
import NotificationRepository from "./repository/notification.repository";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";

@Controller("api/notification")
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationRepo: NotificationRepository,
  ) {}

  @Get()
  @UseGuards(SessionAuthGuard)
  async getNotifications(@Req() req: RequestWithUser) {
    const notifications = await this.notificationRepo.findByUser(req.user.id);
    const unreadCount = await this.notificationRepo.countUnread(req.user.id);

    return {
      data: notifications,
      meta: { unread: unreadCount },
    };
  }

  @Post(":id/read")
  @UseGuards(SessionAuthGuard)
  async markRead(@Param("id") id: string, @Req() req: RequestWithUser) {
    await this.notificationRepo.markAsRead(id, req.user.id);
    return { success: true };
  }

  @Post("read-all")
  @UseGuards(SessionAuthGuard)
  async markAllRead(@Req() req: RequestWithUser) {
    await this.notificationRepo.markAllAsRead(req.user.id);
    return { success: true };
  }

  // @Post('/create')
  // @UseGuards(SessionAuthGuard)
  // private async create(@Res() res: FastifyReply, @Body() body: NotificationCreate, @Req() req: RequestWithUser) {
  //   const entity = await this.notificationService.create({ data: body, userSession: req.user });

  //   (req as any).flash('success', `Plan "${body.title}" creado correctamente.`);
  //   return res.status(HttpStatus.SEE_OTHER).redirect(`/dashboard/subscription/${(entity as any).id}`);
  // }

  // @Post('/:id/read')
  // @UseGuards(SessionAuthGuard)
  // private async update(@Res() res: FastifyReply, @Param() param: { id: string }, @Body() body: NotificationCreate, @Req() req: RequestWithUser) {
  //   const entity = await this.notificationService.read({ id: param.id, userSession: req.user });

  //   (req as any).flash('success', 'Plan actualizado correctamente.');
  //   return res.status(HttpStatus.SEE_OTHER).redirect(`/dashboard/subscription/${(entity as any).id}`);
  // }

  // @Post('/:id/delete')
  // @UseGuards(SessionAuthGuard)
  // private async delete(@Res() res: FastifyReply, @Param() param: { id: string }, @Req() req: RequestWithUser) {
  //   await this.notificationService.delete({ id: param.id, userSession: req.user });

  //   (req as any).flash('success', 'Plan eliminado correctamente.');
  //   return res.status(HttpStatus.SEE_OTHER).redirect(`/dashboard/subscription`);
  // }

  // // --- VISTAS Y FORMULARIOS ---

  // @Get('')
  // @UseGuards(SessionAuthGuard)
  // @UsePipes(new ValidationPipe({ transform: true, transformOptions: { enableImplicitConversion: true } }))
  // private async paginate(@Req() req: RequestWithUser, @Query() query: FilterParamsDto) {
  //   return await this.notificationService.pagination({ query, userSession: req.user });
  // }

  // @Get('/:id')
  // @UseGuards(SessionAuthGuard)
  // private async unique(@Req() req: RequestWithUser, @Param() param: { id: string }) {
  //   return await this.notificationService.unique({ id: param.id, userSession: req.user });
  // }

  // @Get('form/:type')
  // @UseGuards(SessionAuthGuard)
  // private async form(
  //   @Query() query: { id?: string, lang?: string },
  //   @Param() param: { type: string }
  // ) {
  //   const effectiveLang = query.lang || 'es';

  //   const entity = await this.notificationRepository.findOne({ where: { id: query.id } });

  //   if (param.type === 'read' && entity) {
  //     const formStructure = this.notificationRepository.getFormRead({ object: entity, userId: query.id });
  //     return this.notificationService.translateForm(formStructure, effectiveLang);

  //   } else {
  //     throw new NotFoundException('Tipo de formulario no válido');
  //   }
  // }
}
