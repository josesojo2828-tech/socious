import { Injectable } from "@nestjs/common";
import PermitReporitory from "./repository/permit.repository";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { FilterParamsDto } from "src/shared/types/server.type";
import {
  PERMIT_ORDER,
  PERMIT_UPDATE,
  PERMIT_WHERE_UNIQUE,
} from "./dto/permit.type";
import { Permit } from "src/shared/types/schema.types";
import { Actions } from "src/shared/types/dashboard.type";
import { Form } from "src/shared/types/form/form";
import { PermissionGroup } from "./model/permit.model";
import { Logger } from "@nestjs/common";
const logger = new Logger("permit.service");


@Injectable()
export class PermitService {
  constructor(
    private permitRepository: PermitReporitory,
    private eventEmitter: EventEmitter2,
  ) {}

  async getPaginate(query: FilterParamsDto) {
    const limit = query && query.limit ? Number(query.limit) : 10;
    const page = query && query.page ? Number(query.page) : 1;

    const where: any = { deletedAt: null };

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
      ];
    }

    const currentPage = page && page > 0 ? page : 1;
    const skip = (currentPage - 1) * limit;

    const [list, total] = await Promise.all([
      this.permitRepository.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      this.permitRepository.count({ where }),
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

  async findOne(userWhereUniqueInput: PERMIT_WHERE_UNIQUE) {
    const entity = await this.permitRepository.findOne({
      where: userWhereUniqueInput,
    });
    if (!entity) {
      logger.warn(
        `PermitService: Permit not found for criteria:`,
        userWhereUniqueInput,
      );
    }
    return entity;
  }

  async createPermit(data: { name: string; description?: string; list: string[] }) {
    const entity = await this.permitRepository.create({
      data: {
        name: data.name,
        description: data.description || null,
        list: data.list,
      },
    });
    return entity;
  }

  async updatePermit(params: {
    where: { id: string };
    data: { name?: string; description?: string; list?: string[] };
  }) {
    const { where, data } = params;
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.list !== undefined) updateData.list = data.list;

    const entity = await this.permitRepository.update({
      where,
      data: updateData,
    });
    return entity;
  }

  async deletePermit(where: { id: string }) {
    return this.permitRepository.delete({ where });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    cursor?: PERMIT_WHERE_UNIQUE;
    where?: PERMIT_WHERE_UNIQUE;
    orderBy?: PERMIT_ORDER;
  }): Promise<Omit<Permit, "password">[]> {
    const { skip, take, cursor, where, orderBy } = params;
    const entities = await this.permitRepository.findMany({
      skip: skip ? skip : 0,
      take: take ? Number(take) : 10,
      where: where ? where : {},
      orderBy: orderBy ? orderBy : {},
    });

    return entities;
  }

  getAllPermissionsGrouped(): PermissionGroup[] {
    return this.permitRepository.getAllPermissionsGrouped();
  }

  async getActions(permitList: string[], formCreate?: Form, formUpdate?: Form) {
    const actions: Actions = {
      create: null,
      update: null,
      list: null,
      unique: null,
      delete: null,
    };

    return actions;
  }
}
