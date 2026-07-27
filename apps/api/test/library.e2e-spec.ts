import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import * as argon2 from "argon2";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { ProblemDetailsExceptionFilter } from "../src/common/filters/problem-details.filter";

async function deleteTestUserAndDependents(prisma: PrismaService, email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  // Clean up in FK-dependency order so the user row can actually be deleted.
  await prisma.playlistItem.deleteMany({ where: { playlist: { userId: user.id } } });
  await prisma.playlist.deleteMany({ where: { userId: user.id } });
  await prisma.memory.deleteMany({ where: { userId: user.id } });
  await prisma.songUserData.deleteMany({ where: { userId: user.id } });
  await prisma.importJob.deleteMany({ where: { userId: user.id } });
  await prisma.auditEvent.deleteMany({ where: { userId: user.id } });
  await prisma.user.deleteMany({ where: { email } });
}

describe("Resonance library flows (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  const testEmail = "e2e-library-user@example.com";
  const testPassword = "correct-horse-battery-staple";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.use(cookieParser());
    app.useGlobalFilters(new ProblemDetailsExceptionFilter());
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    await deleteTestUserAndDependents(prisma, testEmail);
    await prisma.user.create({
      data: {
        email: testEmail,
        displayName: "E2E Library User",
        passwordHash: await argon2.hash(testPassword),
      },
    });

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: testEmail, password: testPassword });
    const cookieHeader = loginRes.headers["set-cookie"];
    cookie = (Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader]).find((c: string) =>
      c.startsWith("resonance_session="),
    ) as string;
  });

  afterAll(async () => {
    await deleteTestUserAndDependents(prisma, testEmail);
    await app.close();
  });

  it("attaches a tag to a song without a 500 (regression: audit entity_id must not require a UUID)", async () => {
    const artistRes = await request(app.getHttpServer())
      .post("/api/v1/artists")
      .set("Cookie", cookie)
      .send({ canonicalName: "E2E Test Artist" });
    const songRes = await request(app.getHttpServer())
      .post("/api/v1/songs")
      .set("Cookie", cookie)
      .send({ title: "E2E Test Song", primaryArtistId: artistRes.body.artist.id });
    const tagRes = await request(app.getHttpServer())
      .post("/api/v1/tags")
      .set("Cookie", cookie)
      .send({ name: "E2E Tag", category: "GENRE" });

    const attachRes = await request(app.getHttpServer())
      .post(`/api/v1/songs/${songRes.body.song.id}/tags`)
      .set("Cookie", cookie)
      .send({ tagId: tagRes.body.id });

    expect(attachRes.status).toBe(201);
  });

  it("creates a playlist and adds a song to it (regression: same audit entity_id issue)", async () => {
    const artistRes = await request(app.getHttpServer())
      .post("/api/v1/artists")
      .set("Cookie", cookie)
      .send({ canonicalName: "Playlist Artist" });
    const songRes = await request(app.getHttpServer())
      .post("/api/v1/songs")
      .set("Cookie", cookie)
      .send({ title: "Playlist Song", primaryArtistId: artistRes.body.artist.id });
    const playlistRes = await request(app.getHttpServer())
      .post("/api/v1/playlists")
      .set("Cookie", cookie)
      .send({ name: "E2E Playlist" });

    const addItemRes = await request(app.getHttpServer())
      .post(`/api/v1/playlists/${playlistRes.body.playlist.id}/items`)
      .set("Cookie", cookie)
      .send({ songId: songRes.body.song.id, reason: "test" });
    expect(addItemRes.status).toBe(201);

    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/playlists/${playlistRes.body.playlist.id}`)
      .set("Cookie", cookie);
    expect(getRes.body.items).toHaveLength(1);
  });

  it("creates a festival with a performance and returns the brief", async () => {
    const artistRes = await request(app.getHttpServer())
      .post("/api/v1/artists")
      .set("Cookie", cookie)
      .send({ canonicalName: "Festival Artist" });
    const festivalRes = await request(app.getHttpServer())
      .post("/api/v1/festivals")
      .set("Cookie", cookie)
      .send({ name: "E2E Festival" });

    await request(app.getHttpServer())
      .post(`/api/v1/festivals/${festivalRes.body.festival.id}/performances`)
      .set("Cookie", cookie)
      .send({ artistId: artistRes.body.artist.id, priority: 1 });

    const briefRes = await request(app.getHttpServer())
      .get(`/api/v1/festivals/${festivalRes.body.festival.id}`)
      .set("Cookie", cookie);

    expect(briefRes.body.performances).toHaveLength(1);
    expect(briefRes.body.performances[0].artist.canonicalName).toBe("Festival Artist");
  });

  it("adds a memory to a song", async () => {
    const artistRes = await request(app.getHttpServer())
      .post("/api/v1/artists")
      .set("Cookie", cookie)
      .send({ canonicalName: "Memory Artist" });
    const songRes = await request(app.getHttpServer())
      .post("/api/v1/songs")
      .set("Cookie", cookie)
      .send({ title: "Memory Song", primaryArtistId: artistRes.body.artist.id });

    const memoryRes = await request(app.getHttpServer())
      .post("/api/v1/memories")
      .set("Cookie", cookie)
      .send({ entityType: "song", entityId: songRes.body.song.id, title: "Heard live" });

    expect(memoryRes.status).toBe(201);
    expect(memoryRes.body.memory.title).toBe("Heard live");
  });

  it("imports a CSV in two phases (analyze then commit) and skips a duplicate on re-commit", async () => {
    const csv = [
      "track_name,artist_name,rating,favorite",
      "E2E Import Song,E2E Import Artist,8,true",
    ].join("\n");

    const analyzeRes = await request(app.getHttpServer())
      .post("/api/v1/imports")
      .set("Cookie", cookie)
      .send({ filename: "e2e.csv", csvContent: csv });
    expect(analyzeRes.body.status).toBe("ANALYZED");
    expect(analyzeRes.body.summaryJson.validRows).toBe(1);

    const commitRes = await request(app.getHttpServer())
      .post(`/api/v1/imports/${analyzeRes.body.id}/commit`)
      .set("Cookie", cookie);
    expect(commitRes.body.summaryJson.songsCreated).toBe(1);

    // Re-analyzing + committing the same file should detect the duplicate and skip it.
    const secondAnalyzeRes = await request(app.getHttpServer())
      .post("/api/v1/imports")
      .set("Cookie", cookie)
      .send({ filename: "e2e.csv", csvContent: csv });
    expect(secondAnalyzeRes.body.summaryJson.preview[0].duplicate).toBe(true);

    const secondCommitRes = await request(app.getHttpServer())
      .post(`/api/v1/imports/${secondAnalyzeRes.body.id}/commit`)
      .set("Cookie", cookie);
    expect(secondCommitRes.body.summaryJson.duplicatesSkipped).toBe(1);
    expect(secondCommitRes.body.summaryJson.songsCreated).toBe(0);

    // Imports create global (not user-scoped) song/artist rows — clean them up so this
    // test is repeatable across runs instead of finding its own prior data as "duplicate".
    const importedSong = await prisma.song.findFirst({ where: { title: "E2E Import Song" } });
    if (importedSong) {
      await prisma.songUserData.deleteMany({ where: { songId: importedSong.id } });
      await prisma.song.delete({ where: { id: importedSong.id } });
    }
    await prisma.artist.deleteMany({ where: { canonicalName: "E2E Import Artist" } });
  });

  it("produces a full JSON export and a songs CSV export", async () => {
    const fullRes = await request(app.getHttpServer())
      .get("/api/v1/exports/full")
      .set("Cookie", cookie);
    expect(fullRes.status).toBe(200);
    expect(fullRes.body.schemaVersion).toBe(1);
    expect(Array.isArray(fullRes.body.songs)).toBe(true);

    const csvRes = await request(app.getHttpServer())
      .get("/api/v1/exports/songs.csv")
      .set("Cookie", cookie);
    expect(csvRes.status).toBe(200);
    expect(csvRes.text).toContain("track_name,artist_name");
  });

  it("proposes a song analysis as a draft, lists it as pending, and approves it", async () => {
    const artistRes = await request(app.getHttpServer())
      .post("/api/v1/artists")
      .set("Cookie", cookie)
      .send({ canonicalName: "Analysis Artist" });
    const songRes = await request(app.getHttpServer())
      .post("/api/v1/songs")
      .set("Cookie", cookie)
      .send({ title: "Analysis Song", primaryArtistId: artistRes.body.artist.id });

    const proposeRes = await request(app.getHttpServer())
      .post(`/api/v1/songs/${songRes.body.song.id}/analyses`)
      .set("Cookie", cookie)
      .send({
        analysisType: "MEANING",
        summary: "About freedom.",
        structuredData: { themes: ["freedom"] },
      });
    expect(proposeRes.status).toBe(201);
    expect(proposeRes.body.analysis.status).toBe("DRAFT");

    const pendingRes = await request(app.getHttpServer())
      .get("/api/v1/analyses/pending")
      .set("Cookie", cookie);
    expect(
      pendingRes.body.items.some((a: { id: string }) => a.id === proposeRes.body.analysis.id),
    ).toBe(true);

    const approveRes = await request(app.getHttpServer())
      .post(`/api/v1/analyses/${proposeRes.body.analysis.id}/approve`)
      .set("Cookie", cookie);
    expect(approveRes.body.analysis.status).toBe("APPROVED");

    const secondApproveRes = await request(app.getHttpServer())
      .post(`/api/v1/analyses/${proposeRes.body.analysis.id}/approve`)
      .set("Cookie", cookie);
    expect(secondApproveRes.status).toBe(400);
  });

  it("returns 503 (not a raw 500) when generating an analysis without a configured AI provider", async () => {
    const artistRes = await request(app.getHttpServer())
      .post("/api/v1/artists")
      .set("Cookie", cookie)
      .send({ canonicalName: "No AI Artist" });
    const songRes = await request(app.getHttpServer())
      .post("/api/v1/songs")
      .set("Cookie", cookie)
      .send({ title: "No AI Song", primaryArtistId: artistRes.body.artist.id });

    const generateRes = await request(app.getHttpServer())
      .post(`/api/v1/songs/${songRes.body.song.id}/analyses/generate`)
      .set("Cookie", cookie)
      .send({ analysisType: "MEANING" });

    // Only meaningful when OPENAI_API_KEY is unset in the test environment.
    if (!process.env.OPENAI_API_KEY) {
      expect(generateRes.status).toBe(503);
    }
  });

  it("reports Spotify sync as unconfigured until credentials are set (ADR-0010)", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/enrichment/spotify/status")
      .set("Cookie", cookie);
    if (!process.env.SPOTIFY_CLIENT_ID) {
      expect(res.body.configured).toBe(false);
    }
  });

  it("flags overlapping festival performances as colliding", async () => {
    const artistA = await request(app.getHttpServer())
      .post("/api/v1/artists")
      .set("Cookie", cookie)
      .send({ canonicalName: "Collision Artist A" });
    const artistB = await request(app.getHttpServer())
      .post("/api/v1/artists")
      .set("Cookie", cookie)
      .send({ canonicalName: "Collision Artist B" });
    const festivalRes = await request(app.getHttpServer())
      .post("/api/v1/festivals")
      .set("Cookie", cookie)
      .send({ name: "Collision Festival" });

    const perfA = await request(app.getHttpServer())
      .post(`/api/v1/festivals/${festivalRes.body.festival.id}/performances`)
      .set("Cookie", cookie)
      .send({
        artistId: artistA.body.artist.id,
        startsAt: "2026-08-01T18:00:00Z",
        endsAt: "2026-08-01T19:00:00Z",
      });
    const perfB = await request(app.getHttpServer())
      .post(`/api/v1/festivals/${festivalRes.body.festival.id}/performances`)
      .set("Cookie", cookie)
      .send({
        artistId: artistB.body.artist.id,
        startsAt: "2026-08-01T18:30:00Z",
        endsAt: "2026-08-01T19:30:00Z",
      });

    const briefRes = await request(app.getHttpServer())
      .get(`/api/v1/festivals/${festivalRes.body.festival.id}`)
      .set("Cookie", cookie);

    const performanceA = briefRes.body.performances.find(
      (p: { id: string }) => p.id === perfA.body.performance.id,
    );
    expect(performanceA.collidesWith).toContain(perfB.body.performance.id);
  });

  it("returns library stats without external calls", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/stats").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(typeof res.body.totalSongs).toBe("number");
    expect(res.body.songsByDecade).toBeDefined();
  });
});
