import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";

import CondimentRepository from "../repository/condiment.repository";
import { LoggerService } from "src/shared/logger/logger.service";

import {
  CONDIMENT_WHERE,
  CONDIMENT_CREATE,
  CONDIMENT_UPDATE,
  ICreateCondimentDto,
} from "../dto/condiment.type";
import { Condiment } from "src/shared/types/schema.types";
import { FilterParamsDto } from "src/shared/types/server.type";

@Injectable()
export class CondimentService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly condimentRepository: CondimentRepository,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  public async create({ data }: { data: ICreateCondimentDto }) {
    const createData: CONDIMENT_CREATE = {
      name: data.name,
    };
    return this.condimentRepository.create(createData);
  }

  public async update({
    id,
    data,
  }: {
    id: string;
    data: Partial<ICreateCondimentDto>;
  }) {
    const updateData: CONDIMENT_UPDATE = {};
    if (data.name) updateData.name = data.name;
    return this.condimentRepository.update({ id }, updateData);
  }

  public async delete({ id }: { id: string }) {
    return this.condimentRepository.delete({ id });
  }

  public async unique({ id }: { id: string }) {
    return this.condimentRepository.findOne({ id });
  }

  public async pagination({ query }: { query: FilterParamsDto }) {
    const where: CONDIMENT_WHERE = { isActive: true };

    if (query.q) {
      where.name = { contains: query.q, mode: "insensitive" };
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.condimentRepository.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      this.condimentRepository.count(where),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
