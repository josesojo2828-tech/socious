import { ForbiddenException } from "@nestjs/common";
import { SocialFeedService } from "./social-feed.service";
import type { AuthzUser } from "../../permit/authz";

/**
 * Phase 8 (task 8.1) — community moderation authorization.
 *
 * Contract under test: `deletePost`/`deleteComment` grant moderation to admins
 * resolved from `permits.name` (ADMIN/SUPERADMIN), keep author self-delete, and
 * deny regular users. PrismaService is mocked.
 */
const makePrisma = () => ({
  socialPost: {
    findUnique: jest.fn(),
    delete: jest.fn().mockResolvedValue({}),
  },
  postComment: {
    findUnique: jest.fn(),
    deleteMany: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
  },
  postLike: { deleteMany: jest.fn().mockResolvedValue({}) },
});

const makeService = () => {
  const prisma = makePrisma();
  const service = new SocialFeedService(prisma as any);
  return { service, prisma };
};

describe("SocialFeedService.deletePost — moderation", () => {
  it("allows an ADMIN (via permits.name) to delete another author's post", async () => {
    const { service, prisma } = makeService();
    prisma.socialPost.findUnique.mockResolvedValue({
      id: "p1",
      authorId: "someone-else",
    });

    const admin: AuthzUser = { id: "admin-1", permits: { name: "ADMIN" } };
    const result = await service.deletePost("p1", admin);

    expect(result.success).toBe(true);
    expect(prisma.socialPost.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("allows a SUPERADMIN to delete another author's post", async () => {
    const { service, prisma } = makeService();
    prisma.socialPost.findUnique.mockResolvedValue({
      id: "p1",
      authorId: "someone-else",
    });

    const result = await service.deletePost("p1", {
      id: "root",
      permits: { name: "SUPERADMIN" },
    });

    expect(result.success).toBe(true);
  });

  it("allows the author to delete their own post", async () => {
    const { service, prisma } = makeService();
    prisma.socialPost.findUnique.mockResolvedValue({
      id: "p1",
      authorId: "author-1",
    });

    const result = await service.deletePost("p1", {
      id: "author-1",
      permits: { name: "USER" },
    });

    expect(result.success).toBe(true);
  });

  it("rejects a regular non-author user with 403", async () => {
    const { service, prisma } = makeService();
    prisma.socialPost.findUnique.mockResolvedValue({
      id: "p1",
      authorId: "someone-else",
    });

    await expect(
      service.deletePost("p1", { id: "user-2", permits: { name: "USER" } }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.socialPost.delete).not.toHaveBeenCalled();
  });
});

describe("SocialFeedService.deleteComment — moderation", () => {
  it("allows an ADMIN (via permits.name) to delete another user's comment", async () => {
    const { service, prisma } = makeService();
    prisma.postComment.findUnique.mockResolvedValue({
      id: "c1",
      authorId: "someone-else",
      post: { authorId: "another-else" },
    });

    const result = await service.deleteComment("c1", {
      id: "admin-1",
      permits: { name: "ADMIN" },
    });

    expect(result.success).toBe(true);
  });

  it("rejects a regular user who is neither comment author nor post owner", async () => {
    const { service, prisma } = makeService();
    prisma.postComment.findUnique.mockResolvedValue({
      id: "c1",
      authorId: "someone-else",
      post: { authorId: "another-else" },
    });

    await expect(
      service.deleteComment("c1", { id: "user-2", permits: { name: "USER" } }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.postComment.delete).not.toHaveBeenCalled();
  });
});
