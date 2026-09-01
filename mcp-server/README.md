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

## Evaluation

`eval/evaluation.xml` holds 10 verified QA pairs for testing whether an LLM
can effectively use this server's tools (see `.claude/skills/mcp-builder/reference/evaluation.md`
for the methodology). They're built against a small, fixed dataset seeded by
`eval/seed.mjs` — reproduce it against a **fresh** backend before running the
harness, since the answers depend on exactly that data existing and nothing else:

```bash
# 1. restart the backend so H2's in-memory DB resets
cd backend && ./gradlew bootRun

# 2. seed the fixed dataset (2 photographers, 7 photos, 1 series)
cd mcp-server && node eval/seed.mjs

# 3. build, then run the evaluation harness (requires ANTHROPIC_API_KEY)
npm run build
pip install -r ../.claude/skills/mcp-builder/scripts/requirements.txt
python ../.claude/skills/mcp-builder/scripts/evaluation.py \
  -t stdio -c node -a dist/index.js \
  eval/evaluation.xml
```
