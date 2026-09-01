import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getJson, describeApiError, toBoundedJson } from "../services/apiClient.js";
import type { PhotoDetailEnvelope, PhotoListEnvelope, PhotoSummary } from "../types.js";

const GENRE_CODES = [
  "PORTRAIT", "WEDDING", "LANDSCAPE", "NATURE", "STREET", "ARCHITECTURE",
  "FOOD", "TRAVEL", "FASHION", "LIFESTYLE", "COMMERCIAL", "FINE_ART",
] as const;

const COLOR_MOOD_CODES = [
  "WARM", "ENERGETIC", "NATURAL", "COOL", "SERENE", "ROMANTIC",
  "VIBRANT", "MUTED", "DRAMATIC", "CLEAN", "MONOCHROME",
] as const;

const SORT_FIELDS = ["createdAt", "likesCount", "savesCount", "sharesCount", "title"] as const;

const SearchPhotosInputSchema = z
  .object({
    keyword: z.string().max(200).optional().describe("Free-text search matched against photo title/description"),
    genre: z.enum(GENRE_CODES).optional().describe("Filter by genre code"),
    color_mood: z.enum(COLOR_MOOD_CODES).optional().describe("Filter by color mood code"),
    member_id: z.number().int().positive().optional().describe("Restrict results to one photographer's member ID"),
    image_ratio: z.string().max(10).optional().describe("Filter by aspect ratio label, e.g. '1:1', '4:3'"),
    sort_by: z.enum(SORT_FIELDS).default("createdAt").describe("Field to sort by"),
    order: z.enum(["asc", "desc"]).default("desc").describe("Sort direction"),
  })
  .strict();

type SearchPhotosInput = z.infer<typeof SearchPhotosInputSchema>;

function summarize(photo: PhotoSummary) {
  return {
    id: photo.id,
    title: photo.title,
    author: photo.memberName ?? `member #${photo.memberId}`,
    author_profile_name: photo.memberProfileName,
    genre: photo.genre,
    color_mood: photo.colorMood,
    likes: photo.likesCount,
    image_url: photo.imageUrl,
    created_at: photo.createdAt,
  };
}

export function registerPhotoTools(server: McpServer): void {
  server.registerTool(
    "happiness_search_photos",
    {
      title: "Search Happiness Photos",
      description: `Search publicly visible photos on the Happiness portfolio platform.

This tool searches across every photographer's public uploads. It does NOT create, edit, or delete photos — read-only.

Args:
  - keyword (string, optional): free-text match against title/description
  - genre (enum, optional): one of ${GENRE_CODES.join(", ")}
  - color_mood (enum, optional): one of ${COLOR_MOOD_CODES.join(", ")}
  - member_id (number, optional): restrict to one photographer
  - image_ratio (string, optional): e.g. "1:1", "4:3", "16:9"
  - sort_by (enum, default "createdAt"): one of ${SORT_FIELDS.join(", ")}
  - order (enum, default "desc"): "asc" | "desc"

Returns JSON with:
  { "count": number, "photos": [{ id, title, author, author_profile_name, genre, color_mood, likes, image_url, created_at }] }

Examples:
  - "Find recent wedding photos" -> genre="WEDDING"
  - "Show member 12's most-liked work" -> member_id=12, sort_by="likesCount"

Error Handling:
  - Returns an "Error: ..." message if the Happiness backend is unreachable or returns an unexpected status.`,
      inputSchema: SearchPhotosInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: SearchPhotosInput) => {
      try {
        const envelope = await getJson<PhotoListEnvelope>("/photos", {
          keyword: params.keyword,
          genre: params.genre,
          colorMood: params.color_mood,
          memberId: params.member_id,
          imageRatio: params.image_ratio,
          sortBy: params.sort_by,
          order: params.order,
        });
        const photos = envelope.data ?? [];
        const output = { count: photos.length, photos: photos.map(summarize) };
        return {
          content: [{ type: "text", text: toBoundedJson(output) }],
          structuredContent: output,
        };
      } catch (error) {
        return { content: [{ type: "text", text: describeApiError(error, "photo search") }] };
      }
    }
  );

  server.registerTool(
    "happiness_get_photo",
    {
      title: "Get Happiness Photo Detail",
      description: `Fetch full detail for a single public photo by ID, including author attribution, mood/genre tags, and engagement counts.

Args:
  - photo_id (number, required): the photo's numeric ID

Returns JSON with the photo's full public fields (title, description, author, genre, color_mood, likes/saves/shares counts, image URL, created_at).

Error Handling:
  - Returns "Error: ... not found (404)" if no photo exists with that ID.`,
      inputSchema: { photo_id: z.number().int().positive().describe("Numeric photo ID") },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ photo_id }: { photo_id: number }) => {
      try {
        const envelope = await getJson<PhotoDetailEnvelope>(`/photos/${photo_id}`);
        const p = envelope.data;
        const output = {
          id: p.id,
          title: p.title,
          description: p.description,
          author: p.memberName ?? `member #${p.memberId}`,
          author_profile_name: p.memberProfileName,
          genre: p.genre,
          sub_genres: p.subGenres,
          color_mood: p.colorMood,
          likes: p.likesCount,
          saves: p.savesCount,
          shares: p.sharesCount,
          image_url: p.imageUrl,
          created_at: p.createdAt,
        };
        return {
          content: [{ type: "text", text: toBoundedJson(output) }],
          structuredContent: output,
        };
      } catch (error) {
        return { content: [{ type: "text", text: describeApiError(error, `photo #${photo_id}`) }] };
      }
    }
  );
}
