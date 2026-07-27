import { ServiceUnavailableException } from "@nestjs/common";
import { SpotifyService } from "./spotify.service";

describe("SpotifyService", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("reports unconfigured and throws a clear error when no credentials are set", () => {
    process.env = {
      ...originalEnv,
      SPOTIFY_CLIENT_ID: undefined,
      SPOTIFY_CLIENT_SECRET: undefined,
    };
    const service = new SpotifyService();

    expect(service.isConfigured()).toBe(false);
    expect(() => service.assertConfigured()).toThrow(ServiceUnavailableException);
  });

  it("reports configured once both credentials are set", () => {
    process.env = { ...originalEnv, SPOTIFY_CLIENT_ID: "id", SPOTIFY_CLIENT_SECRET: "secret" };
    const service = new SpotifyService();

    expect(service.isConfigured()).toBe(true);
    expect(() => service.assertConfigured()).not.toThrow();
  });
});
