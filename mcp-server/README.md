# happiness-mcp-server

Read-only [MCP](https://modelcontextprotocol.io) server for the Happiness photo
portfolio platform. It wraps only the backend's **public, unauthenticated**
GET endpoints, so any MCP client (Claude Desktop, Claude Code, etc.) can
browse photos and portfolios without ever needing a login or being able to
create/edit/delete anything.

## Tools

| Tool | Wraps | Description |
|---|---|---|
| `happiness_search_photos` | `GET /api/photos` | Search public photos by keyword, genre, color mood, member, ratio, sort order |
| `happiness_get_photo` | `GET /api/photos/:id` | Full detail for one public photo |
| `happiness_get_portfolio` | `GET /api/portfolio/:profileName` | A photographer's public profile, photos, series, and stats |
| `happiness_get_portfolio_config` | `GET /api/portfolio/:profileName/config` | Which visual template a portfolio uses |
| `happiness_list_series` | `GET /api/series?memberId=` | A photographer's curated series/collections |

Deliberately **not** exposed: anything requiring auth (uploads, likes, comments,
reports, admin, genre stats — the last of these turned out to require a JWT
despite looking public) and anything destructive.

## Setup

```bash
npm install
npm run build
```

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `HAPPINESS_API_URL` | `http://localhost:8080/api` | Base URL of the Happiness backend |

## Running

Local/stdio (the standard way an MCP client like Claude Desktop launches it):

```bash
npm start
```

Add it to an MCP client config, e.g. Claude Desktop's `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "happiness": {
      "command": "node",
      "args": ["/absolute/path/to/happiness-app/mcp-server/dist/index.js"],
      "env": { "HAPPINESS_API_URL": "http://localhost:8080/api" }
    }
  }
}
```

## Development

```bash
npm run dev    # tsx watch mode
npm run build  # compile to dist/
```
