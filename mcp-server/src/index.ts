#!/usr/bin/env node
/**
 * happiness-mcp-server
 *
 * Read-only MCP server for the Happiness photo portfolio platform.
 * Wraps only public, unauthenticated GET endpoints (photo search/detail,
 * portfolio browsing, series listing) — no login, no writes, no deletes.
 *
 * Configure the backend location with HAPPINESS_API_URL (default:
 * http://localhost:8080/api).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerPhotoTools } from "./tools/photos.js";
import { registerPortfolioTools } from "./tools/portfolio.js";

const server = new McpServer({
  name: "happiness-mcp-server",
  version: "1.0.0",
});

registerPhotoTools(server);
registerPortfolioTools(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("happiness-mcp-server running via stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
