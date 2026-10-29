import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import UniversityRepository from "../repository/university.repository";
import { FilterParamsDto } from "src/shared/types/server.type";
import {
  UNIVERSITY_ORDER,
  UNIVERSITY_WHERE,
  UNIVERSITY_WHERE_UNIQUE,
} from "../dto/university.type";
import { User } from "src/shared/types/schema.types";

@Injectable()
export class UniversityService {
  constructor(
    private universityRepository: UniversityRepository,
  ) {}

  async getPaginate(query: FilterParamsDto, sessionUser: User) {
    if (!sessionUser?.permits?.list?.includes(this.universityRepository.UNIVERSITY_LIST)) {
      throw new ForbiddenException("No tienes permiso para listar universidades");
    }

    const limit = query && query.limit ? Number(query.limit) : 10;
    const page = query && query.page ? Number(query.page) : 1;

    const where: any = {};

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { shortName: { contains: query.q, mode: "insensitive" } },
      ];
    }

    const currentPage = page && page > 0 ? page : 1;
    const skip = (currentPage - 1) * limit;

    const [list, total] = await Promise.all([
      this.universityRepository.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      this.universityRepository.count({ where }),
    ]);

    const totalRecords = total;
    const totalPages = Math.ceil(totalRecords / limit);
    const hasPrev = currentPage > 1;
    const hasNext = currentPage < totalPages;

    return {
      list,
      total,
      totalRecords,
      totalPages,
      currentPage,
      limit,
      hasPrev,
      hasNext,
    };
  }

  async findActive() {
    const list = await this.universityRepository.findMany({
      where: { isActive: true },
      skip: 0,
      take: 1000,
      orderBy: { name: "asc" },
    });
    return { list };
  }

  async findOne(where: UNIVERSITY_WHERE_UNIQUE) {
    const entity = await this.universityRepository.findOne({
      where,
    });
    if (!entity) {
      throw new NotFoundException("Universidad no encontrada");
    }
    return entity;
  }

  async create(data: { name: string; shortName?: string; isActive?: boolean }, sessionUser: User) {
    if (!sessionUser?.permits?.list?.includes(this.universityRepository.UNIVERSITY_CREATED)) {
      throw new ForbiddenException("No tienes permiso para crear universidades");
    }

    return this.universityRepository.create({
      data: {
        name: data.name,
        shortName: data.shortName || null,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(
    params: {
      where: { id: string };
      data: { name?: string; shortName?: string; isActive?: boolean };
    },
    sessionUser: User,
  ) {
    if (!sessionUser?.permits?.list?.includes(this.universityRepository.UNIVERSITY_UPDATED)) {
      throw new ForbiddenException("No tienes permiso para actualizar universidades");
    }

    const { where, data } = params;
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.shortName !== undefined) updateData.shortName = data.shortName;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const entity = await this.universityRepository.update({
      where,
      data: updateData,
    });

    if (!entity || (entity as any).error) {
      throw new NotFoundException("Universidad no encontrada");
    }

    return entity;
  }

  async delete(where: { id: string }, sessionUser: User) {
    if (!sessionUser?.permits?.list?.includes(this.universityRepository.UNIVERSITY_DELETED)) {
      throw new ForbiddenException("No tienes permiso para eliminar universidades");
    }

    const entity = await this.universityRepository.softDelete({ where });
    if (!entity || (entity as any).error) {
      throw new NotFoundException("Universidad no encontrada");
    }
    return entity;
  }
}
