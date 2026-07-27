import { Injectable, ServiceUnavailableException } from "@nestjs/common";

/**
 * Spotify sync is explicitly deferred by the source design doc (ADR-0010, "Could" priority,
 * §12.3: "odložit, dokud ruční práce neprokáže konkrétní potřebu"). This stub exists so the
 * API surface and error shape are already in place; it never fabricates data and always fails
 * loudly until real OAuth credentials are configured.
 */
@Injectable()
export class SpotifyService {
  isConfigured(): boolean {
    return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
  }

  assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        "Spotify sync is not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to enable it " +
          "(deferred per ADR-0010 until manual use proves it's needed).",
      );
    }
  }
}
