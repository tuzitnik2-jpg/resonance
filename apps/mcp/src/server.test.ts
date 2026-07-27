import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildServer } from "./server";

// The doc's threat model (§13.1) requires the MVP to never expose a delete/remove MCP tool,
// and §10.4 requires every read tool to be annotated readOnlyHint=true so clients can apply
// their own approval policy. These tests guard both invariants at the registry level, using
// the SDK's in-memory transport so a real Client drives introspection (tools/list) against
// our server without going over HTTP.
async function connectedClient() {
  const server = buildServer("fake-token");
  const client = new Client({ name: "test-client", version: "0.0.1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { server, client };
}

describe("buildServer", () => {
  it("registers exactly the 15 tools from the source design doc §10.2", async () => {
    const { client } = await connectedClient();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();

    expect(names).toEqual(
      [
        "add_memory",
        "add_playlist_items",
        "approve_analysis",
        "create_playlist_draft",
        "create_song",
        "export_user_data",
        "get_festival_brief",
        "get_music_context",
        "get_pending_changes",
        "get_song",
        "propose_song_analysis",
        "search_artists",
        "search_songs",
        "update_song_metadata",
        "update_song_user_data",
      ].sort(),
    );
  });

  it("never registers a delete/remove tool", async () => {
    const { client } = await connectedClient();
    const { tools } = await client.listTools();
    expect(tools.some((t) => /delete|remove/i.test(t.name))).toBe(false);
  });

  it("annotates every read-only tool with readOnlyHint=true", async () => {
    const { client } = await connectedClient();
    const { tools } = await client.listTools();
    const readTools = [
      "get_music_context",
      "search_songs",
      "get_song",
      "search_artists",
      "get_festival_brief",
      "get_pending_changes",
    ];
    for (const tool of tools) {
      if (readTools.includes(tool.name)) {
        expect(tool.annotations?.readOnlyHint).toBe(true);
      }
    }
  });
});
