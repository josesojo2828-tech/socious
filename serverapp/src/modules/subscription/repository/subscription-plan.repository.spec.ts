import type { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import type { LoggerService } from "src/shared/logger/logger.service";
import SubscriptionPlanRepository from "./subscription-plan.repository";

const colorTheme = {
  bg: "#111018",
  text: "#f8f5ec",
  accent: "#b2944a",
  badge: "#8e7538",
};

const entity = {
  id: "PREMIUM",
  name: "Negocio",
  description: "Todo el Avanzado con sucursales y equipo incluidos.",
  price: 99.99,
  currency: "USD",
  selected: false,
  badge: null,
  featured: false,
  colorTheme,
  content: { features: ["Todo lo del plan Avanzado"] },
  deletedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

function buildRepository(record: Record<string, unknown>) {
  const prisma = {
    subscriptionPlan: {
      findFirst: jest.fn().mockResolvedValue(record),
    },
  };
  const repository = new SubscriptionPlanRepository(
    prisma as unknown as PrismaService,
    {} as unknown as EventEmitter2,
    {} as unknown as LoggerService,
  );
  return { repository, findFirst: prisma.subscriptionPlan.findFirst };
}

describe("SubscriptionPlanRepository formatting", () => {
  it("passes selected, badge, featured and colorTheme through while keeping the existing fields", async () => {
    const { repository, findFirst } = buildRepository(entity);

    const result = await repository.findOne({ where: { id: "PREMIUM" } });

    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      id: "PREMIUM",
      name: "Negocio",
      description: entity.description,
      price: 99.99,
      currency: "USD",
      content: entity.content,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      selected: false,
      badge: null,
      featured: false,
      colorTheme,
    });
  });
});
