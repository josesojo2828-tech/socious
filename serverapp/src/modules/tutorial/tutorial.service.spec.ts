import { BadRequestException, ConflictException } from "@nestjs/common";
import { TutorialService } from "./tutorial.service";
import { parseYoutubeId } from "./youtube";

const originalFetch = global.fetch;

function mockFetch(payload: Record<string, unknown> = {}) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      title: "Cargar productos desde Excel",
      author_name: "Socius",
      thumbnail_url: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
      ...payload,
    }),
  }) as unknown as typeof fetch;
}

function makeService(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = {
    tutorial: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(async (args: any) => ({ id: "t-1", ...args.data })),
      update: jest.fn(async (args: any) => ({ id: "t-1", ...args.data })),
      ...prismaOverrides,
    },
  };
  return { service: new TutorialService(prisma as any), prisma };
}

describe("tutorial youtube helpers", () => {
  it("extracts the id from every common URL form", () => {
    expect(parseYoutubeId("https://www.youtube.com/watch?v=abcdefghijk")).toBe(
      "abcdefghijk",
    );
    expect(parseYoutubeId("https://youtu.be/abcdefghijk?t=10")).toBe(
      "abcdefghijk",
    );
    expect(parseYoutubeId("https://www.youtube.com/shorts/abcdefghijk")).toBe(
      "abcdefghijk",
    );
    expect(parseYoutubeId("https://www.youtube.com/embed/abcdefghijk")).toBe(
      "abcdefghijk",
    );
    expect(parseYoutubeId("abcdefghijk")).toBe("abcdefghijk");
    expect(parseYoutubeId("https://example.com/video")).toBeNull();
  });
});

describe("TutorialService", () => {
  beforeEach(() => mockFetch());
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("previews a link with the oEmbed metadata", async () => {
    const { service } = makeService();

    const preview = await service.preview(
      "https://www.youtube.com/watch?v=abcdefghijk",
    );

    expect(preview).toMatchObject({
      youtubeId: "abcdefghijk",
      youtubeUrl: "https://www.youtube.com/watch?v=abcdefghijk",
      title: "Cargar productos desde Excel",
      thumbnailUrl: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
    });
  });

  it("rejects an invalid link", async () => {
    const { service } = makeService();

    await expect(
      service.preview("https://example.com/nada"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a video that is already loaded", async () => {
    const { service } = makeService({
      findFirst: jest.fn().mockResolvedValue({ id: "t-existing" }),
    });

    await expect(
      service.create({ url: "https://youtu.be/abcdefghijk" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("fills the title from YouTube when the admin leaves it empty", async () => {
    const { service, prisma } = makeService();

    await service.create({
      url: "https://youtu.be/abcdefghijk",
      series: "primeros-pasos",
      duration: "4 min",
    });

    expect(prisma.tutorial.create.mock.calls[0][0].data).toMatchObject({
      youtubeId: "abcdefghijk",
      title: "Cargar productos desde Excel",
      duration: "4 min",
      published: true,
    });
  });

  it("keeps the typed title even when YouTube is unreachable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as any;
    const { service, prisma } = makeService();

    await service.create({
      url: "https://youtu.be/abcdefghijk",
      title: "Mi título",
    });

    expect(prisma.tutorial.create.mock.calls[0][0].data).toMatchObject({
      title: "Mi título",
      thumbnailUrl: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
    });
  });
});
