import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { PermissionService } from '../../permit/service/permission.service';
import { CommunityQueryDto, CommunityItemResponse, PaginatedResponse, CommunityStatsResponse } from './dto/community.dto';

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
  ) {}

  async getCommunityStats(user: any): Promise<CommunityStatsResponse> {
    if (!this.permissionService.hasCommunityAccess(user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }

    const [totalMenus, menus, metadataList] = await Promise.all([
      this.prisma.menu.count({ where: { isCommunity: true, deletedAt: null, archivedAt: null } }),
      this.prisma.menu.findMany({
        where: { isCommunity: true, deletedAt: null, archivedAt: null },
        select: { category: true, totalKcal: true },
      }),
      this.prisma.communityMetadata.findMany({
        where: { entityType: 'menu' },
        select: { tags: true },
      }),
    ]);

    const totalKcalSum = menus.reduce((acc, m) => acc + (m.totalKcal ? Number(m.totalKcal) : 0), 0);
    const totalKcalAvg = totalMenus > 0 ? Math.round(totalKcalSum / totalMenus) : 0;

    const catMap: Record<string, number> = {};
    menus.forEach((m) => {
      const c = m.category || 'OTHER';
      catMap[c] = (catMap[c] || 0) + 1;
    });

    const categoryLabels: Record<string, string> = {
      BREAKFAST: 'Desayunos',
      LUNCH: 'Almuerzos',
      DINNER: 'Cenas',
      SNACK: 'Snacks / Meriendas',
      OTHER: 'Otros',
    };

    const categoryStats = Object.keys(categoryLabels).map((catKey) => ({
      category: catKey,
      label: categoryLabels[catKey],
      count: catMap[catKey] || 0,
    }));

    const TAG_ALIASES: Record<string, string> = {
      'sin-gluten': 'celiaquia',
      'sin gluten': 'celiaquia',
      celiacos: 'celiaquia',
      'bajo-ig': 'diabetes',
      'bajo ig': 'diabetes',
      glucémico: 'diabetes',
      glucosa: 'diabetes',
      'higado-graso': 'higado_graso',
      'higado graso': 'higado_graso',
      colesterol: 'dislipidemia',
      cardio: 'hipertension',
      'salud-renal': 'renal',
    };

    const pathologyLabels: Record<string, string> = {
      diabetes: 'Diabetes / Glucémico',
      hipertension: 'Hipertensión / Cardio',
      renal: 'Salud Renal',
      celiaquia: 'Sin Gluten / Celíacos',
      higado_graso: 'Hígado Graso',
      dislipidemia: 'Dislipidemia / Colesterol',
      general: 'General / Saludable',
    };

    const pathologyKeys = Object.keys(pathologyLabels);

    const tagCounts: Record<string, number> = {};
    metadataList.forEach((meta) => {
      (meta.tags || []).forEach((t) => {
        const lower = t.toLowerCase().trim();
        const aliased = TAG_ALIASES[lower] || lower;
        if (pathologyKeys.includes(aliased)) {
          tagCounts[aliased] = (tagCounts[aliased] || 0) + 1;
        }
      });
    });

    const taggedTotal = Object.keys(tagCounts).reduce((sum, key) => sum + tagCounts[key], 0);

    const pathologyStats = Object.entries(pathologyLabels).map(([tagKey, label]) => ({
      tag: tagKey,
      label,
      count: tagKey === 'general'
        ? Math.max(0, totalMenus - (taggedTotal - (tagCounts[tagKey] || 0)))
        : (tagCounts[tagKey] || 0),
    }));

    return {
      totalMenus,
      totalKcalAvg,
      pathologyStats,
      categoryStats,
    };
  }

  async getCommunityMenus(
    query: CommunityQueryDto,
    user: any,
  ): Promise<PaginatedResponse<CommunityItemResponse>> {
    if (!this.permissionService.hasCommunityAccess(user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }

    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const where: any = { isCommunity: true, deletedAt: null, archivedAt: null };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.tags && query.tags.length > 0) {
      const tagFilter = query.tags[0];
      const TAG_REVERSE: Record<string, string[]> = {
        diabetes: ['diabetes', 'bajo-ig', 'glucémico', 'glucosa'],
        hipertension: ['hipertension', 'hipertensión', 'cardio'],
        renal: ['renal', 'salud-renal'],
        celiaquia: ['celiaquia', 'sin-gluten', 'sin gluten', 'celiacos'],
        higado_graso: ['higado-graso', 'higado graso'],
        dislipidemia: ['dislipidemia', 'colesterol'],
      };
      const dbTags = TAG_REVERSE[tagFilter] || [tagFilter];
      const menuIdsWithTag = (
        await this.prisma.communityMetadata.findMany({
          where: {
            entityType: 'menu',
            tags: { hasSome: dbTags },
          },
          select: { entityId: true },
        })
      ).map((m) => m.entityId);
      where.id = { in: menuIdsWithTag };
    }

    const [menus, total] = await Promise.all([
      this.prisma.menu.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.menu.count({ where }),
    ]);

    const metadataMap = await this.fetchMetadataMap('menu', menus.map((m) => m.id));

    const data: CommunityItemResponse[] = menus.map((menu) => {
      const meta = metadataMap.get(menu.id);
      return {
        id: meta?.id ?? menu.id,
        entityType: 'menu',
        entityId: menu.id,
        title: menu.name,
        description: menu.description ?? undefined,
        imageUrl: menu.imageUrl ?? undefined,
        tags: meta?.tags ?? [],
        importCount: meta?.importCount ?? 0,
        publishedAt: meta?.publishedAt ?? menu.createdAt,
        author: {
          id: meta?.author?.id ?? '',
          fullName: meta?.author?.fullName ?? undefined,
          username: meta?.author?.username ?? undefined,
          avatarUrl: meta?.author?.avatarUrl ?? undefined,
          email: meta?.author?.email ?? undefined,
          specialty: meta?.author?.specialty ?? undefined,
          isPublicPortfolio: meta?.author?.isPublicPortfolio ?? true,
        },
        macros: {
          kcal: menu.totalKcal ? Number(menu.totalKcal) : 0,
          protein: menu.totalProtein ? Number(menu.totalProtein) : 0,
          carbs: menu.totalCarbs ? Number(menu.totalCarbs) : 0,
          fats: menu.totalFats ? Number(menu.totalFats) : 0,
        },
      };
    });

    return { data, meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) } };
  }

  async getCommunityMenuDetail(id: string, user: any) {
    if (!this.permissionService.hasCommunityAccess(user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }

    const menu = await this.prisma.menu.findFirst({
      where: { id, isCommunity: true, deletedAt: null, archivedAt: null },
      include: { items: { include: { food: true } } },
    });

    if (!menu) {
      throw new NotFoundException('Menú comunitario no encontrado.');
    }

    const AUTHOR_SELECT = {
      id: true,
      fullName: true,
      username: true,
      avatarUrl: true,
      email: true,
      nutritionistProfile: {
        select: {
          specialty: true,
          photoUrl: true,
          isPublic: true,
        },
      },
    };

    const meta = await this.prisma.communityMetadata.findUnique({
      where: { entityType_entityId: { entityType: 'menu', entityId: id } },
      include: { author: { select: AUTHOR_SELECT } },
    });

    let publishedCount = 0;
    if (meta?.authorId) {
      publishedCount = await this.prisma.communityMetadata.count({
        where: { authorId: meta.authorId },
      });
    }

    const authorData = meta?.author
      ? {
          id: meta.author.id,
          fullName: meta.author.fullName,
          username: meta.author.username,
          avatarUrl: meta.author.avatarUrl || meta.author.nutritionistProfile?.photoUrl,
          email: meta.author.email,
          specialty: meta.author.nutritionistProfile?.specialty,
          isPublicPortfolio: meta.author.nutritionistProfile?.isPublic ?? true,
          publishedCount,
        }
      : null;

    return {
      ...menu,
      communityMetadata: meta
        ? {
            ...meta,
            author: authorData,
          }
        : null,
    };
  }

  async getCommunityExchangeLists(
    query: CommunityQueryDto,
    user: any,
  ): Promise<PaginatedResponse<CommunityItemResponse>> {
    if (!this.permissionService.hasCommunityAccess(user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }

    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const where: any = { isCommunity: true, deletedAt: null, archivedAt: null };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [lists, total] = await Promise.all([
      this.prisma.exchangeList.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.exchangeList.count({ where }),
    ]);

    const metadataMap = await this.fetchMetadataMap('exchange-list', lists.map((l) => l.id));

    const data: CommunityItemResponse[] = lists.map((list) => {
      const meta = metadataMap.get(list.id);
      return {
        id: meta?.id ?? list.id,
        entityType: 'exchange-list',
        entityId: list.id,
        title: list.name,
        description: list.description ?? undefined,
        tags: meta?.tags ?? [],
        importCount: meta?.importCount ?? 0,
        publishedAt: meta?.publishedAt ?? list.createdAt,
        author: {
          id: meta?.author?.id ?? '',
          fullName: meta?.author?.fullName ?? undefined,
          username: meta?.author?.username ?? undefined,
          avatarUrl: meta?.author?.avatarUrl ?? undefined,
          email: meta?.author?.email ?? undefined,
          specialty: meta?.author?.specialty ?? undefined,
          isPublicPortfolio: meta?.author?.isPublicPortfolio ?? true,
        },
        macros: {
          kcal: list.baseKcal ?? 0,
          protein: list.baseProtein ? Number(list.baseProtein) : 0,
          carbs: list.baseCarbs ? Number(list.baseCarbs) : 0,
          fats: list.baseFat ? Number(list.baseFat) : 0,
        },
      };
    });

    return { data, meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) } };
  }

  async getCommunityExchangeListDetail(id: string, user: any) {
    if (!this.permissionService.hasCommunityAccess(user)) {
      throw new ForbiddenException('No tienes acceso a la comunidad premium.');
    }

    const list = await this.prisma.exchangeList.findFirst({
      where: { id, isCommunity: true, deletedAt: null, archivedAt: null },
      include: {
        _count: true,
        items: { include: { foodExchangeList: true } },
      },
    });

    if (!list) {
      throw new NotFoundException('Lista de intercambio comunitaria no encontrada.');
    }

    const meta = await this.prisma.communityMetadata.findUnique({
      where: { entityType_entityId: { entityType: 'exchange-list', entityId: id } },
      include: { author: { select: { id: true, fullName: true, email: true } } },
    });

    return { ...list, communityMetadata: meta };
  }

  async importCommunityMenu(menuId: string, user: any) {
    if (!this.permissionService.hasPermission(user, 'COMMUNITY_IMPORT')) {
      throw new ForbiddenException('No tienes permiso para importar contenido.');
    }

    const original = await this.prisma.menu.findFirst({
      where: { id: menuId, isCommunity: true, deletedAt: null, archivedAt: null },
      include: { items: true },
    });

    if (!original) {
      throw new NotFoundException('Menú comunitario no encontrado.');
    }

    const copy = await this.prisma.menu.create({
      data: {
        name: `${original.name} (importado)`,
        description: original.description,
        category: original.category,
        tags: original.tags,
        prepTime: original.prepTime,
        difficulty: original.difficulty,
        isCommunity: false,
        importedFromId: original.id,
        importedFromType: 'menu',
        nutritionistId: user.nutritionistProfile?.id,
        createdById: user.id,
      },
    });

    if (original.items.length > 0) {
      await this.prisma.menuItem.createMany({
        data: original.items.map((item) => ({
          menuId: copy.id,
          foodId: item.foodId,
          quantity: item.quantity,
          unit: item.unit,
          portionLabel: item.portionLabel,
        })),
      });
    }

    await this.prisma.communityMetadata.upsert({
      where: { entityType_entityId: { entityType: 'menu', entityId: original.id } },
      create: {
        entityType: 'menu',
        entityId: original.id,
        authorId: user.id,
        tags: [],
        importCount: 1,
      },
      update: { importCount: { increment: 1 } },
    });

    return copy;
  }

  async importCommunityExchangeList(listId: string, user: any) {
    if (!this.permissionService.hasPermission(user, 'COMMUNITY_IMPORT')) {
      throw new ForbiddenException('No tienes permiso para importar contenido.');
    }

    const original = await this.prisma.exchangeList.findFirst({
      where: { id: listId, isCommunity: true, deletedAt: null, archivedAt: null },
      include: { items: true },
    });

    if (!original) {
      throw new NotFoundException('Lista de intercambio comunitaria no encontrada.');
    }

    const copy = await this.prisma.exchangeList.create({
      data: {
        name: `${original.name} (importado)`,
        description: original.description,
        isCommunity: false,
        importedFromId: original.id,
        importedFromType: 'exchange-list',
        nutritionistId: user.nutritionistProfile?.id,
        createdById: user.id,
      },
    });

    if (original.items.length > 0) {
      await this.prisma.exchangeListItem.createMany({
        data: original.items.map((item) => ({
          exchangeListId: copy.id,
          foodExchangeListId: item.foodExchangeListId,
          amount: item.amount,
          servingLabel: item.servingLabel,
        })),
      });
    }

    await this.prisma.communityMetadata.upsert({
      where: { entityType_entityId: { entityType: 'exchange-list', entityId: original.id } },
      create: {
        entityType: 'exchange-list',
        entityId: original.id,
        authorId: user.id,
        tags: [],
        importCount: 1,
      },
      update: { importCount: { increment: 1 } },
    });

    return copy;
  }

  async publishMenu(menuId: string, user: any) {
    if (!this.permissionService.hasPermission(user, 'COMMUNITY_PUBLISH')) {
      throw new ForbiddenException('No tienes permiso para publicar en la comunidad.');
    }

    const menu = await this.prisma.menu.findFirst({
      where: { id: menuId, nutritionistId: user.nutritionistProfile?.id, deletedAt: null, archivedAt: null },
    });

    if (!menu) {
      throw new NotFoundException('Menú no encontrado.');
    }

    await this.prisma.menu.update({
      where: { id: menuId },
      data: { isCommunity: true },
    });

    await this.prisma.communityMetadata.upsert({
      where: { entityType_entityId: { entityType: 'menu', entityId: menuId } },
      create: { entityType: 'menu', entityId: menuId, authorId: user.id, tags: [] },
      update: {},
    });

    return { message: 'Menú publicado en la comunidad.' };
  }

  async publishExchangeList(listId: string, user: any) {
    if (!this.permissionService.hasPermission(user, 'COMMUNITY_PUBLISH')) {
      throw new ForbiddenException('No tienes permiso para publicar en la comunidad.');
    }

    const list = await this.prisma.exchangeList.findFirst({
      where: { id: listId, nutritionistId: user.nutritionistProfile?.id, deletedAt: null, archivedAt: null },
    });

    if (!list) {
      throw new NotFoundException('Lista de intercambio no encontrada.');
    }

    await this.prisma.exchangeList.update({
      where: { id: listId },
      data: { isCommunity: true },
    });

    await this.prisma.communityMetadata.upsert({
      where: { entityType_entityId: { entityType: 'exchange-list', entityId: listId } },
      create: { entityType: 'exchange-list', entityId: listId, authorId: user.id, tags: [] },
      update: {},
    });

    return { message: 'Lista de intercambio publicada en la comunidad.' };
  }

  async unpublishMenu(menuId: string, user: any) {
    const metadata = await this.prisma.communityMetadata.findUnique({
      where: { entityType_entityId: { entityType: 'menu', entityId: menuId } },
    });

    if (!metadata || metadata.authorId !== user.id) {
      throw new ForbiddenException('No eres el autor de esta publicación.');
    }

    await this.prisma.menu.update({
      where: { id: menuId },
      data: { isCommunity: false },
    });

    await this.prisma.communityMetadata.delete({
      where: { entityType_entityId: { entityType: 'menu', entityId: menuId } },
    });

    return { message: 'Menú retirado de la comunidad.' };
  }

  async unpublishExchangeList(listId: string, user: any) {
    const metadata = await this.prisma.communityMetadata.findUnique({
      where: { entityType_entityId: { entityType: 'exchange-list', entityId: listId } },
    });

    if (!metadata || metadata.authorId !== user.id) {
      throw new ForbiddenException('No eres el autor de esta publicación.');
    }

    await this.prisma.exchangeList.update({
      where: { id: listId },
      data: { isCommunity: false },
    });

    await this.prisma.communityMetadata.delete({
      where: { entityType_entityId: { entityType: 'exchange-list', entityId: listId } },
    });

    return { message: 'Lista de intercambio retirada de la comunidad.' };
  }

  async getMyPublishedItems(user: any): Promise<CommunityItemResponse[]> {
    const metadataList = await this.prisma.communityMetadata.findMany({
      where: { authorId: user.id },
      include: { author: { select: { id: true, fullName: true, email: true } } },
      orderBy: { publishedAt: 'desc' },
    });

    const menuIds = metadataList.filter(m => m.entityType === 'menu').map(m => m.entityId);
    const exchangeListIds = metadataList.filter(m => m.entityType === 'exchange-list').map(m => m.entityId);

    const [menus, exchangeLists] = await Promise.all([
      menuIds.length > 0
        ? this.prisma.menu.findMany({ where: { id: { in: menuIds } } })
        : Promise.resolve([]),
      exchangeListIds.length > 0
        ? this.prisma.exchangeList.findMany({ where: { id: { in: exchangeListIds } } })
        : Promise.resolve([]),
    ]);

    const menuMap = new Map(menus.map(m => [m.id, m]));
    const exchangeListMap = new Map(exchangeLists.map(l => [l.id, l]));

    const data: CommunityItemResponse[] = [];

    for (const meta of metadataList) {
      if (meta.entityType === 'menu') {
        const menu = menuMap.get(meta.entityId);
        if (menu) {
          data.push({
            id: meta.id,
            entityType: 'menu',
            entityId: meta.entityId,
            title: menu.name,
            description: menu.description ?? undefined,
            imageUrl: menu.imageUrl ?? undefined,
            tags: meta.tags,
            importCount: meta.importCount,
            publishedAt: meta.publishedAt,
            author: { id: meta.author.id, fullName: meta.author.fullName ?? undefined, email: meta.author.email ?? undefined },
            macros: {
              kcal: menu.totalKcal ? Number(menu.totalKcal) : 0,
              protein: menu.totalProtein ? Number(menu.totalProtein) : 0,
              carbs: menu.totalCarbs ? Number(menu.totalCarbs) : 0,
              fats: menu.totalFats ? Number(menu.totalFats) : 0,
            },
          });
        }
      } else if (meta.entityType === 'exchange-list') {
        const list = exchangeListMap.get(meta.entityId);
        if (list) {
          data.push({
            id: meta.id,
            entityType: 'exchange-list',
            entityId: meta.entityId,
            title: list.name,
            description: list.description ?? undefined,
            tags: meta.tags,
            importCount: meta.importCount,
            publishedAt: meta.publishedAt,
            author: { id: meta.author.id, fullName: meta.author.fullName ?? undefined, email: meta.author.email ?? undefined },
            macros: {
              kcal: list.baseKcal ?? 0,
              protein: list.baseProtein ? Number(list.baseProtein) : 0,
              carbs: list.baseCarbs ? Number(list.baseCarbs) : 0,
              fats: list.baseFat ? Number(list.baseFat) : 0,
            },
          });
        }
      }
    }

    return data;
  }

  async getMyImports(user: any) {
    const menus = await this.prisma.menu.findMany({
      where: { nutritionistId: user.nutritionistProfile?.id, importedFromId: { not: null }, deletedAt: null, archivedAt: null },
      select: { id: true, name: true, importedFromId: true, importedFromType: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const exchangeLists = await this.prisma.exchangeList.findMany({
      where: { nutritionistId: user.nutritionistProfile?.id, importedFromId: { not: null }, deletedAt: null, archivedAt: null },
      select: { id: true, name: true, importedFromId: true, importedFromType: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return { menus, exchangeLists };
  }

  private async fetchMetadataMap(entityType: string, entityIds: string[]) {
    if (entityIds.length === 0) return new Map();
    const all = await this.prisma.communityMetadata.findMany({
      where: { entityType, entityId: { in: entityIds } },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
            email: true,
            nutritionistProfile: {
              select: {
                specialty: true,
                photoUrl: true,
                isPublic: true,
              },
            },
          },
        },
      },
    });

    return new Map(
      all.map((m) => {
        const authorData = m.author
          ? {
              ...m.author,
              avatarUrl: m.author.avatarUrl || m.author.nutritionistProfile?.photoUrl || undefined,
              specialty: m.author.nutritionistProfile?.specialty || undefined,
              isPublicPortfolio: m.author.nutritionistProfile?.isPublic ?? true,
            }
          : undefined;

        return [
          m.entityId,
          {
            ...m,
            author: authorData,
          },
        ];
      })
    );
  }
}
