import { NotFoundException } from "@nestjs/common";
import { MusicBrainzService } from "./musicbrainz.service";

describe("MusicBrainzService", () => {
  const artist = {
    id: "artist-1",
    canonicalName: "Queen Omega",
    normalizedName: "queen omega",
    deletedAt: null,
  };

  function buildService(overrides: { fetchResponse?: unknown; fetchOk?: boolean } = {}) {
    const prisma = {
      artist: {
        findFirst: jest.fn().mockResolvedValue(artist),
        update: jest.fn().mockImplementation(({ data }) => ({ ...artist, ...data })),
      },
    };
    const audit = { record: jest.fn().mockResolvedValue("audit-id") };

    global.fetch = jest.fn().mockResolvedValue({
      ok: overrides.fetchOk ?? true,
      status: 200,
      json: async () => overrides.fetchResponse ?? { artists: [] },
    }) as unknown as typeof fetch;

    const service = new MusicBrainzService(prisma as never, audit as never);
    return { service, prisma, audit };
  }

  it("attaches the musicbrainzId on a high-confidence match", async () => {
    const { service, prisma, audit } = buildService({
      fetchResponse: {
        artists: [{ id: "mbid-1", name: "Queen Omega", score: 100, country: "TT" }],
      },
    });

    const result = await service.enrichArtist("artist-1", {
      userId: "user-1",
      email: "x@example.com",
    });

    expect(result.attached).toBe(true);
    expect(prisma.artist.update).toHaveBeenCalledWith({
      where: { id: "artist-1" },
      data: { musicbrainzId: "mbid-1" },
    });
    expect(audit.record).toHaveBeenCalled();
  });

  it("does not auto-attach a low-confidence match, and never fabricates an artist", async () => {
    const { service, prisma } = buildService({
      fetchResponse: { artists: [{ id: "mbid-weak", name: "Not Really A Match", score: 40 }] },
    });

    const result = await service.enrichArtist("artist-1", {
      userId: "user-1",
      email: "x@example.com",
    });

    expect(result.attached).toBe(false);
    expect(result.candidates).toHaveLength(1);
    expect(prisma.artist.update).not.toHaveBeenCalled();
  });

  it("throws NotFoundException for an unknown artist instead of proceeding", async () => {
    const { service, prisma } = buildService();
    prisma.artist.findFirst.mockResolvedValue(null);

    await expect(
      service.enrichArtist("missing-id", { userId: "user-1", email: "x@example.com" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
