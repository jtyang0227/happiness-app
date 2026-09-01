import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getJson, describeApiError, toBoundedJson } from "../services/apiClient.js";
import type { PortfolioConfigResponse, PortfolioResponse, SeriesSummary } from "../types.js";

const ProfileNameSchema = z
  .string()
  .min(1)
  .max(30)
  .regex(/^[a-z0-9-]+$/, "Profile names use only lowercase letters, digits, and hyphens")
  .describe("The photographer's public portfolio slug, e.g. 'jane-doe' (from happiness.app/portfolio/{profileName})");

export function registerPortfolioTools(server: McpServer): void {
  server.registerTool(
    "happiness_get_portfolio",
    {
      title: "Get Photographer Portfolio",
      description: `Fetch a photographer's public portfolio: profile info, published photos, series/collections, and follower/like stats.

Args:
  - profile_name (string, required): the photographer's portfolio slug

Returns JSON with:
  {
    "member": { member_id, name, profile_name, bio, location, specialties, website_url, joined_at },
    "photo_count": number, "follower_count": number, "following_count": number, "total_likes": number,
    "photos": [ ...same shape as happiness_search_photos results... ],
    "series": [{ id, title, description, photo_count }]
  }
  Use member.member_id as the input to happiness_list_series to see this photographer's series.

Error Handling:
  - Returns "Error: ... not found (404)" if no photographer uses that profile name.
  - Returns "Error: ... is private (403)" if the photographer has disabled public browsing.`,
      inputSchema: { profile_name: ProfileNameSchema },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ profile_name }: { profile_name: string }) => {
      try {
        const data = await getJson<PortfolioResponse>(`/portfolio/${profile_name}`);
        const output = {
          member: {
            member_id: data.member.id,
            name: data.member.name,
            profile_name: data.member.profileName,
            bio: data.member.bio,
            location: data.member.location,
            specialties: data.member.specialties,
            website_url: data.member.websiteUrl,
            joined_at: data.member.createdAt,
          },
          photo_count: data.photoCount,
          follower_count: data.followerCount,
          following_count: data.followingCount,
          total_likes: data.totalLikes,
          photos: (data.photos ?? []).map((p) => ({
            id: p.id,
            title: p.title,
            genre: p.genre,
            color_mood: p.colorMood,
            likes: p.likesCount,
            image_url: p.imageUrl,
          })),
          series: (data.series ?? []).map((s: SeriesSummary) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            photo_count: s.photoCount,
          })),
        };
        return {
          content: [{ type: "text", text: toBoundedJson(output) }],
          structuredContent: output,
        };
      } catch (error) {
        return { content: [{ type: "text", text: describeApiError(error, `portfolio '${profile_name}'`) }] };
      }
    }
  );

  server.registerTool(
    "happiness_get_portfolio_config",
    {
      title: "Get Portfolio Template Config",
      description: `Fetch which visual template a photographer's portfolio uses (e.g. EDITORIAL, MINIMAL, SCRL, DARK_ROOM).

Args:
  - profile_name (string, required): the photographer's portfolio slug

Returns JSON: { "template": string, "has_custom_style": boolean, "has_custom_sections": boolean }

Error Handling:
  - Returns "Error: ... not found (404)" if no photographer uses that profile name.`,
      inputSchema: { profile_name: ProfileNameSchema },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ profile_name }: { profile_name: string }) => {
      try {
        const data = await getJson<PortfolioConfigResponse>(`/portfolio/${profile_name}/config`);
        const output = {
          template: data.template,
          has_custom_style: !!data.styleJson,
          has_custom_sections: !!data.sectionsJson,
        };
        return {
          content: [{ type: "text", text: toBoundedJson(output) }],
          structuredContent: output,
        };
      } catch (error) {
        return { content: [{ type: "text", text: describeApiError(error, `portfolio config for '${profile_name}'`) }] };
      }
    }
  );

  server.registerTool(
    "happiness_list_series",
    {
      title: "List Photographer's Series",
      description: `List a photographer's photo series (curated collections/albums) by their member ID.

Args:
  - member_id (number, required): the photographer's numeric member ID — read it from 'member.member_id' in a happiness_get_portfolio result, or 'author_member_id' on any photo returned by happiness_search_photos / happiness_get_photo

Returns JSON: { "count": number, "series": [{ id, title, description, photo_count, cover_image_url }] }

Error Handling:
  - Returns an empty list (not an error) if the member has no series or does not exist.`,
      inputSchema: { member_id: z.number().int().positive().describe("Numeric member ID of the photographer") },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ member_id }: { member_id: number }) => {
      try {
        const series = await getJson<SeriesSummary[]>("/series", { memberId: member_id });
        const output = {
          count: series.length,
          series: series.map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            photo_count: s.photoCount,
            cover_image_url: s.coverImageUrl,
          })),
        };
        return {
          content: [{ type: "text", text: toBoundedJson(output) }],
          structuredContent: output,
        };
      } catch (error) {
        return { content: [{ type: "text", text: describeApiError(error, `series for member #${member_id}`) }] };
      }
    }
  );
}
