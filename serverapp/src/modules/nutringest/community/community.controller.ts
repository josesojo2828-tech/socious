import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { SocialFeedService } from './social-feed.service';
import { SessionAuthGuard } from 'src/modules/auth/guards/authenticated.guard';
import { Public } from 'src/shared/decorators/public.decorator';
import { PermissionService } from 'src/modules/permit/service/permission.service';
import { CommunityQueryDto } from './dto/community.dto';
import { CreatePostDto, CreateCommentDto, FeedQueryDto } from './dto/social-feed.dto';
import type { RequestWithUser } from 'src/shared/types/server.type';

@Controller('api/community')
@UseGuards(SessionAuthGuard)
export class CommunityController {
  constructor(
    private readonly communityService: CommunityService,
    private readonly socialFeedService: SocialFeedService,
    private readonly permissionService: PermissionService,
  ) {}

  // --- PUBLIC SOCIAL FEED ENDPOINT ---
  @Get('public/feed')
  @Public()
  async getPublicFeedPosts(@Query() query: FeedQueryDto) {
    return this.socialFeedService.getFeedPosts(query);
  }

  // --- SOCIAL FEED ENDPOINTS ---
  @Get('feed')
  async getFeedPosts(
    @Req() req: RequestWithUser,
    @Query() query: FeedQueryDto,
  ) {
    if (!this.permissionService.hasCommunityAccess(req.user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }
    return this.socialFeedService.getFeedPosts(query, req.user);
  }

  @Post('feed')
  async createPost(
    @Req() req: RequestWithUser,
    @Body() dto: CreatePostDto,
  ) {
    if (!this.permissionService.hasCommunityAccess(req.user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }
    return this.socialFeedService.createPost(dto, req.user);
  }

  @Delete('feed/:id')
  async deletePost(
    @Param('id') postId: string,
    @Req() req: RequestWithUser,
  ) {
    if (!this.permissionService.hasCommunityAccess(req.user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }
    return this.socialFeedService.deletePost(postId, req.user);
  }

  @Post('feed/:id/like')
  async toggleLike(
    @Param('id') postId: string,
    @Req() req: RequestWithUser,
  ) {
    if (!this.permissionService.hasCommunityAccess(req.user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }
    return this.socialFeedService.toggleLike(postId, req.user);
  }

  @Post('feed/:id/bookmark')
  async toggleBookmark(
    @Param('id') postId: string,
    @Req() req: RequestWithUser,
  ) {
    if (!this.permissionService.hasCommunityAccess(req.user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }
    return this.socialFeedService.toggleBookmark(postId, req.user);
  }

  @Post('feed/:id/comment')
  async addComment(
    @Param('id') postId: string,
    @Req() req: RequestWithUser,
    @Body() dto: CreateCommentDto,
  ) {
    if (!this.permissionService.hasCommunityAccess(req.user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }
    return this.socialFeedService.addComment(postId, dto, req.user);
  }

  @Delete('feed/comments/:commentId')
  async deleteComment(
    @Param('commentId') commentId: string,
    @Req() req: RequestWithUser,
  ) {
    if (!this.permissionService.hasCommunityAccess(req.user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }
    return this.socialFeedService.deleteComment(commentId, req.user);
  }

  @Post('feed/:id/share')
  async sharePost(
    @Param('id') postId: string,
    @Req() req: RequestWithUser,
    @Body('content') content: string,
  ) {
    if (!this.permissionService.hasCommunityAccess(req.user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }
    return this.socialFeedService.sharePost(postId, content, req.user);
  }

  @Post('users/:id/follow')
  async toggleFollowUser(
    @Param('id') targetUserId: string,
    @Req() req: RequestWithUser,
  ) {
    if (!this.permissionService.hasCommunityAccess(req.user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }
    return this.socialFeedService.toggleFollowUser(targetUserId, req.user);
  }

  // --- EXISTENTES (MENUS & PLANES) ---
  @Get('menus')
  async getCommunityMenus(
    @Req() req: RequestWithUser,
    @Query() query: CommunityQueryDto,
  ) {
    if (!this.permissionService.hasCommunityAccess(req.user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }
    return this.communityService.getCommunityMenus(query, req.user);
  }

  @Get('stats')
  async getCommunityStats(@Req() req: RequestWithUser) {
    if (!this.permissionService.hasCommunityAccess(req.user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }
    return this.communityService.getCommunityStats(req.user);
  }

  @Get('menus/:id')
  async getCommunityMenuDetail(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    if (!this.permissionService.hasCommunityAccess(req.user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }
    return this.communityService.getCommunityMenuDetail(id, req.user);
  }

  @Get('exchange-lists')
  async getCommunityExchangeLists(
    @Req() req: RequestWithUser,
    @Query() query: CommunityQueryDto,
  ) {
    if (!this.permissionService.hasCommunityAccess(req.user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }
    return this.communityService.getCommunityExchangeLists(query, req.user);
  }

  @Get('exchange-lists/:id')
  async getCommunityExchangeListDetail(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    if (!this.permissionService.hasCommunityAccess(req.user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }
    return this.communityService.getCommunityExchangeListDetail(id, req.user);
  }

  @Post('menus/:id/import')
  async importMenu(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.communityService.importCommunityMenu(id, req.user);
  }

  @Post('exchange-lists/:id/import')
  async importExchangeList(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.communityService.importCommunityExchangeList(id, req.user);
  }

  @Post('menus/:id/publish')
  async publishMenu(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.communityService.publishMenu(id, req.user);
  }

  @Post('exchange-lists/:id/publish')
  async publishExchangeList(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.communityService.publishExchangeList(id, req.user);
  }

  @Post('menus/:id/unpublish')
  async unpublishMenu(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.communityService.unpublishMenu(id, req.user);
  }

  @Post('exchange-lists/:id/unpublish')
  async unpublishExchangeList(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.communityService.unpublishExchangeList(id, req.user);
  }

  @Get('my-published')
  async getMyPublished(@Req() req: RequestWithUser) {
    return this.communityService.getMyPublishedItems(req.user);
  }

  @Get('my-imports')
  async getMyImports(@Req() req: RequestWithUser) {
    return this.communityService.getMyImports(req.user);
  }
}
