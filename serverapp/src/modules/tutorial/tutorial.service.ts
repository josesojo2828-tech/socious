import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { CreateTutorialDto, UpdateTutorialDto } from "./dto/tutorial.dto";
import { fetchOembed, parseYoutubeId, youtubeThumbnail } from "./youtube";

@Injectable()
export class TutorialService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public catalog: only published rows, in the order the admin arranged. */
  async listPublic() {
    return this.prisma.tutorial.findMany({
      where: { published: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  /** Admin view: includes unpublished and planned tutorials. */
  async listAdmin() {
    return this.prisma.tutorial.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  /** Reads a pasted link and returns what YouTube exposes without an API key. */
  async preview(url: string) {
    const videoId = parseYoutubeId(url);
    if (!videoId) {
      throw new BadRequestException(
        "El enlace de YouTube no es válido. Pegá el link del video.",
      );
    }

    const oembed = await fetchOembed(videoId).catch(() => null);
    return {
      youtubeId: videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      title: oembed?.title ?? "",
      authorName: oembed?.authorName ?? null,
      thumbnailUrl: oembed?.thumbnailUrl ?? youtubeThumbnail(videoId),
    };
  }

  async create(dto: CreateTutorialDto) {
    const videoId = parseYoutubeId(dto.url);
    if (!videoId) {
      throw new BadRequestException(
        "El enlace de YouTube no es válido. Pegá el link del video.",
      );
    }

    const existing = await this.prisma.tutorial.findFirst({
      where: { youtubeId: videoId, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException("Ese video ya está cargado.");
    }

    // Fill what the admin left blank from oEmbed; never fail the save when
    // YouTube is unreachable and a title was typed by hand.
    const needsMetadata = !dto.title?.trim();
    const oembed = needsMetadata
      ? await fetchOembed(videoId).catch(() => null)
      : null;
    const title = dto.title?.trim() || oembed?.title || "Tutorial de YouTube";

    return this.prisma.tutorial.create({
      data: {
        youtubeId: videoId,
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        title,
        description: dto.description?.trim() || null,
        thumbnailUrl: oembed?.thumbnailUrl ?? youtubeThumbnail(videoId),
        series: dto.series ?? "primeros-pasos",
        duration: dto.duration?.trim() || null,
        code: dto.code?.trim() || null,
        featured: dto.featured ?? false,
        published: dto.published ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateTutorialDto) {
    const tutorial = await this.prisma.tutorial.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, youtubeId: true },
    });
    if (!tutorial) throw new NotFoundException("Tutorial no encontrado.");

    let youtubeId = tutorial.youtubeId;
    let thumbnailUrl: string | undefined;
    if (dto.youtubeUrl) {
      const parsed = parseYoutubeId(dto.youtubeUrl);
      if (!parsed) {
        throw new BadRequestException("El enlace de YouTube no es válido.");
      }
      youtubeId = parsed;
      thumbnailUrl = youtubeThumbnail(parsed);
    }

    return this.prisma.tutorial.update({
      where: { id },
      data: {
        ...(youtubeId ? { youtubeId } : {}),
        ...(dto.youtubeUrl
          ? { youtubeUrl: `https://www.youtube.com/watch?v=${youtubeId}` }
          : {}),
        ...(thumbnailUrl ? { thumbnailUrl } : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
        ...(dto.series !== undefined ? { series: dto.series } : {}),
        ...(dto.duration !== undefined
          ? { duration: dto.duration.trim() || null }
          : {}),
        ...(dto.code !== undefined ? { code: dto.code.trim() || null } : {}),
        ...(dto.featured !== undefined ? { featured: dto.featured } : {}),
        ...(dto.published !== undefined ? { published: dto.published } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  /** Soft delete: the public list stops showing it, the row stays auditable. */
  async remove(id: string) {
    const tutorial = await this.prisma.tutorial.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!tutorial) throw new NotFoundException("Tutorial no encontrado.");

    await this.prisma.tutorial.update({
      where: { id },
      data: { deletedAt: new Date(), published: false },
    });
    return { id, deleted: true };
  }
}
