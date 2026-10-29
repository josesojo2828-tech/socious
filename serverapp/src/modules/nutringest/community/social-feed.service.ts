import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreatePostDto, CreateCommentDto, FeedQueryDto } from './dto/social-feed.dto';
import { User } from '@prisma/client';
import { isAdmin, type AuthzUser } from '../../permit/authz';

@Injectable()
export class SocialFeedService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureSeedData(currentUser?: User) {
    // No-op: do not load hardcoded seed posts
    return;
  }

  async getFeedPosts(query: FeedQueryDto, currentUser?: User) {
    await this.ensureSeedData(currentUser);

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const whereCondition: any = {};

    if (query.username) {
      whereCondition.author = {
        username: { equals: query.username, mode: 'insensitive' },
      };
    }

    if (query.filter === 'ARTICLES') {
      whereCondition.postType = 'ARTICLE';
    } else if (query.filter === 'CASES') {
      whereCondition.postType = 'CASE_STUDY';
    } else if (query.filter === 'FOLLOWING' && currentUser) {
      const followingRecords = await this.prisma.userFollow.findMany({
        where: { followerId: currentUser.id },
        select: { followingId: true },
      });
      const followingIds = followingRecords.map((f) => f.followingId);
      whereCondition.authorId = { in: [...followingIds, currentUser.id] };
    }

    const currentUserId = currentUser?.id || '__none__';

    const [posts, totalCount] = await Promise.all([
      this.prisma.socialPost.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              username: true,
              avatarUrl: true,
            },
          },
          scientificArticle: true,
          sharedPost: {
            include: {
              author: {
                select: {
                  fullName: true,
                  avatarUrl: true,
                },
              },
              scientificArticle: true,
            },
          },
          likes: {
            where: { userId: currentUserId },
            select: { id: true },
          },
          bookmarks: {
            where: { userId: currentUserId },
            select: { id: true },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              shares: true,
            },
          },
          comments: {
            where: { parentId: null },
            orderBy: { createdAt: 'asc' },
            include: {
              author: {
                select: {
                  id: true,
                  fullName: true,
                  avatarUrl: true,
                },
              },
              replies: {
                orderBy: { createdAt: 'asc' },
                include: {
                  author: {
                    select: {
                      id: true,
                      fullName: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.socialPost.count({ where: whereCondition }),
    ]);

    const formattedPosts = posts.map((post) => ({
      id: post.id,
      author: {
        id: post.author.id,
        fullName: post.author.fullName || post.author.username || 'Nutricionista Verificado',
        username: post.author.username,
        avatarUrl: post.author.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        specialty: 'Nutricionista Verificado MPPS',
        isVerified: true,
      },
      createdAt: new Date(post.createdAt).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
      postType: post.postType,
      content: post.content,
      articleData: post.scientificArticle || undefined,
      sharedPost: post.sharedPost
        ? {
            id: post.sharedPost.id,
            authorName: post.sharedPost.author.fullName || 'Colega',
            authorUsername: post.sharedPost.author.username,
            content: post.sharedPost.content,
            articleTitle: post.sharedPost.scientificArticle?.title,
            articleData: post.sharedPost.scientificArticle || undefined,
          }
        : undefined,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      sharesCount: post._count.shares,
      userLiked: currentUser ? post.likes.length > 0 : false,
      userBookmarked: currentUser ? post.bookmarks.length > 0 : false,
      comments: post.comments.map((c) => ({
        id: c.id,
        parentId: c.parentId,
        author: {
          id: c.author.id,
          fullName: c.author.fullName || 'Nutricionista',
          username: c.author.username,
          avatarUrl: c.author.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          isVerified: true,
        },
        content: c.content,
        createdAt: new Date(c.createdAt).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
        }),
        replies: c.replies.map((r) => ({
          id: r.id,
          parentId: r.parentId,
          author: {
            id: r.author.id,
            fullName: r.author.fullName || 'Nutricionista',
            username: r.author.username,
            avatarUrl: r.author.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            isVerified: true,
          },
          content: r.content,
          createdAt: new Date(r.createdAt).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
          }),
        })),
      })),
    }));

    return {
      data: formattedPosts,
      meta: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async createPost(dto: CreatePostDto, currentUser: User) {
    let articleId: string | undefined = undefined;

    if (dto.articleData) {
      const createdArticle = await this.prisma.scientificArticle.create({
        data: {
          title: dto.articleData.title,
          authors: dto.articleData.authors,
          journal: dto.articleData.journal,
          publicationYear: Number(dto.articleData.publicationYear) || 2026,
          doi: dto.articleData.doi,
          pdfUrl: dto.articleData.pdfUrl,
          category: dto.articleData.category,
          tags: dto.articleData.tags || [],
          abstract: dto.articleData.abstract,
          clinicalTakeaways: dto.articleData.clinicalTakeaways || [],
        },
      });
      articleId = createdArticle.id;
    }

    const post = await this.prisma.socialPost.create({
      data: {
        authorId: currentUser.id,
        content: dto.content,
        postType: dto.postType || 'GENERAL',
        sharedPostId: dto.sharedPostId,
        articleId,
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
          },
        },
        scientificArticle: true,
      },
    });

    return post;
  }

  async toggleLike(postId: string, currentUser: User) {
    const existing = await this.prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: currentUser.id,
        },
      },
    });

    if (existing) {
      await this.prisma.postLike.delete({
        where: { id: existing.id },
      });
      return { liked: false };
    } else {
      await this.prisma.postLike.create({
        data: {
          postId,
          userId: currentUser.id,
        },
      });
      return { liked: true };
    }
  }

  async toggleBookmark(postId: string, currentUser: User) {
    const post = await this.prisma.socialPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Publicación no encontrada.');

    const existing = await this.prisma.postBookmark.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: currentUser.id,
        },
      },
    });

    if (existing) {
      await this.prisma.postBookmark.delete({
        where: { id: existing.id },
      });
      return { bookmarked: false };
    } else {
      await this.prisma.postBookmark.create({
        data: {
          postId,
          userId: currentUser.id,
        },
      });
      return { bookmarked: true };
    }
  }

  async addComment(postId: string, dto: CreateCommentDto, currentUser: User) {
    const post = await this.prisma.socialPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Publicación no encontrada.');

    const comment = await this.prisma.postComment.create({
      data: {
        postId,
        authorId: currentUser.id,
        content: dto.content,
        parentId: dto.parentId || null,
      },
      include: {
        author: {
          select: {
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return comment;
  }

  async toggleFollowUser(targetUserId: string, currentUser: User) {
    if (targetUserId === currentUser.id) {
      throw new BadRequestException('No puedes seguirte a ti mismo.');
    }

    const existing = await this.prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.id,
          followingId: targetUserId,
        },
      },
    });

    if (existing) {
      await this.prisma.userFollow.delete({
        where: { id: existing.id },
      });
      return { following: false };
    } else {
      await this.prisma.userFollow.create({
        data: {
          followerId: currentUser.id,
          followingId: targetUserId,
        },
      });
      return { following: true };
    }
  }

  async sharePost(postId: string, quoteContent: string, currentUser: User) {
    const originalPost = await this.prisma.socialPost.findUnique({ where: { id: postId } });
    if (!originalPost) throw new NotFoundException('Publicación original no encontrada.');

    const sharedPost = await this.prisma.socialPost.create({
      data: {
        authorId: currentUser.id,
        content: quoteContent || 'Compartido con la comunidad',
        sharedPostId: postId,
        postType: originalPost.postType,
      },
    });

    return sharedPost;
  }

  async deletePost(postId: string, currentUser: AuthzUser) {
    const post = await this.prisma.socialPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Publicación no encontrada.');
    }

    const isAuthor = post.authorId === currentUser.id;
    const isAdminUser = isAdmin(currentUser);

    if (!isAuthor && !isAdminUser) {
      throw new ForbiddenException('No tienes permisos para eliminar esta publicación.');
    }

    await this.prisma.postComment.deleteMany({ where: { postId } });
    await this.prisma.postLike.deleteMany({ where: { postId } });

    await this.prisma.socialPost.delete({
      where: { id: postId },
    });

    return { success: true, message: 'Publicación eliminada correctamente.' };
  }

  async deleteComment(commentId: string, currentUser: AuthzUser) {
    const comment = await this.prisma.postComment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: {
            authorId: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comentario no encontrado.');
    }

    const isCommentAuthor = comment.authorId === currentUser.id;
    const isPostOwner = comment.post?.authorId === currentUser.id;
    const isAdminUser = isAdmin(currentUser);

    if (!isCommentAuthor && !isPostOwner && !isAdminUser) {
      throw new ForbiddenException('No tienes permiso para eliminar este comentario.');
    }

    // Delete child replies if any
    await this.prisma.postComment.deleteMany({
      where: { parentId: commentId },
    });

    // Delete comment
    await this.prisma.postComment.delete({
      where: { id: commentId },
    });

    return { success: true, message: 'Comentario eliminado correctamente.' };
  }
}
