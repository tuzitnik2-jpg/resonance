import { type NextRequest } from "next/server";

// Runtime proxy: forward /api/v1/* to the real API, reading API_INTERNAL_URL on every request.
// This replaces the old next.config.js rewrite, which baked the target at BUILD time (so a
// Render env-var change that only restarts — not rebuilds — the service never took effect).
// Proxying keeps the session cookie same-site: the browser only ever talks to this app's origin.

export const dynamic = "force-dynamic";

function apiBase(): string {
  const raw = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  return /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
}

async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await ctx.params;
  const target = `${apiBase()}/api/v1/${path.join("/")}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: "manual",
    });
  } catch (err) {
    // Surface the configured target so a misconfigured API_INTERNAL_URL is diagnosable.
    // (The API's URL is a public onrender.com address — not a secret.)
    return Response.json(
      { error: "api_proxy_unreachable", target: apiBase(), message: String(err) },
      { status: 502 },
    );
  }

  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (
      k === "set-cookie" ||
      k === "content-encoding" ||
      k === "content-length" ||
      k === "transfer-encoding"
    ) {
      return;
    }
    resHeaders.set(key, value);
  });
  // Set-Cookie must be relayed as discrete headers (getSetCookie), not comma-folded.
  const setCookies =
    typeof upstream.headers.getSetCookie === "function" ? upstream.headers.getSetCookie() : [];
  for (const cookie of setCookies) resHeaders.append("set-cookie", cookie);

  // 204/205/304 responses must have a null body — the Response constructor throws otherwise.
  const nullBody = [204, 205, 304].includes(upstream.status);
  return new Response(nullBody ? null : await upstream.arrayBuffer(), {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
