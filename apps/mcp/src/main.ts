import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildServer } from "./server";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

/**
 * Stateless remote MCP endpoint: one McpServer + transport per request, scoped to the caller's
 * bearer token (ChatGPT's remote MCP connector sends this as the "authorization" setting —
 * source design doc §10.3/Appendix D). No session state is kept between requests.
 */
app.post("/mcp", async (req, res) => {
  const bearerToken = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearerToken) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Missing bearer token in Authorization header." },
      id: null,
    });
    return;
  }

  const server = buildServer(bearerToken);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = process.env.MCP_PORT ? Number(process.env.MCP_PORT) : 3002;
app.listen(port, () => {
  console.log(`Resonance MCP server listening on port ${port}`);
});
