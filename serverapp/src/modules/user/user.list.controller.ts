import {
  Controller,
  Get,
  UseGuards,
  Req,
  Query,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";
import { UserService } from "./services/user.service";
import { SubscriptionService } from "./services/subscription.service";
import { UserListQueryDto } from "./dto/user-list-query.dto";

@UseGuards(SessionAuthGuard)
@Controller("api/dashboard/users")
export class UserListController {
  constructor(
    private readonly userService: UserService,
    private readonly susbcriptionService: SubscriptionService,
  ) {}

  @Get("/api/list")
  @UseGuards(SessionAuthGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  public async apiList(
    @Req() req: RequestWithUser,
    @Query() query: UserListQueryDto,
  ) {
    return await this.userService.getPaginate(
      query,
      undefined,
      false,
      undefined,
      req.user,
    );
  }

  @Get("/subscriptions/api/list")
  @UseGuards(SessionAuthGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  public async apiSubscriptionList(
    @Req() req: RequestWithUser,
    @Query() query: FilterParamsDto,
  ) {
    return await this.susbcriptionService.getPaginate(query);
  }

  @Get("/feedback/api/list")
  @UseGuards(SessionAuthGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  public async apiFeedbackList(
    @Req() req: RequestWithUser,
    @Query() query: FilterParamsDto,
  ) {
    return await this.userService.getPageFeedback({
      query,
      sessionUser: req.user,
    });
  }

  @Get("/payment-methods/api/list")
  @UseGuards(SessionAuthGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  public async apiPaymentMethodsList(
    @Req() req: RequestWithUser,
    @Query() query: FilterParamsDto,
  ) {
    return await this.userService.getPagePaymentMethodList({
      query,
      sessionUser: req.user,
    });
  }
}
