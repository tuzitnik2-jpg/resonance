import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import * as argon2 from "argon2";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { ProblemDetailsExceptionFilter } from "../src/common/filters/problem-details.filter";

describe("Resonance API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testEmail = "e2e-test-user@example.com";
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
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.user.create({
      data: {
        email: testEmail,
        displayName: "E2E Test User",
        passwordHash: await argon2.hash(testPassword),
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  it("GET /api/v1/health returns 200 without auth", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /api/v1/me without a session returns an RFC 7807 401", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/me");
    expect(res.status).toBe(401);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.body).toMatchObject({ status: 401 });
  });

  it("POST /api/v1/auth/login with wrong password returns 401", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: testEmail, password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("logs in, receives a session cookie, and can access /me", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: testEmail, password: testPassword });

    expect(loginRes.status).toBe(200);
    const cookieHeader = loginRes.headers["set-cookie"];
    expect(cookieHeader).toBeDefined();
    const sessionCookie = (Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader]).find(
      (c: string) => c.startsWith("resonance_session="),
    );
    expect(sessionCookie).toBeDefined();

    const meRes = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Cookie", sessionCookie as string);

    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(testEmail);
  });
});
