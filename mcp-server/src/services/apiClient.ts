import axios, { AxiosError } from "axios";
import { API_BASE_URL, CHARACTER_LIMIT } from "../constants.js";

/**
 * Shared read-only HTTP client for the Happiness public API.
 *
 * Deliberately exposes only GET — this server wraps public, unauthenticated
 * endpoints and must never be able to create, modify, or delete data.
 */
export async function getJson<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const response = await axios.get<T>(`${API_BASE_URL}${path}`, {
    params,
    timeout: 15000,
    headers: { Accept: "application/json" },
  });
  return response.data;
}

/** Converts a caught error into an actionable message for the calling LLM. */
export function describeApiError(error: unknown, context: string): string {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ message?: string }>;
    if (err.response) {
      const serverMessage = err.response.data?.message;
      switch (err.response.status) {
        case 404:
          return `Error: ${context} not found (404).${serverMessage ? ` ${serverMessage}` : ""}`;
        case 403:
          return `Error: ${context} is private and cannot be viewed without authentication (403).`;
        case 429:
          return `Error: Too many requests to the Happiness API (429). Please wait and retry.`;
        default:
          return `Error: Request for ${context} failed with status ${err.response.status}.${serverMessage ? ` ${serverMessage}` : ""}`;
      }
    }
    if (err.code === "ECONNABORTED") {
      return `Error: Request for ${context} timed out. The Happiness API may be unreachable.`;
    }
    return `Error: Could not reach the Happiness API while fetching ${context} (${err.code ?? "network error"}). Is the backend running at the configured HAPPINESS_API_URL?`;
  }
  return `Error: Unexpected error while fetching ${context}: ${error instanceof Error ? error.message : String(error)}`;
}

/** Serializes a value to JSON, truncating with a clear marker if it exceeds CHARACTER_LIMIT. */
export function toBoundedJson(value: unknown): string {
  const text = JSON.stringify(value, null, 2);
  if (text.length <= CHARACTER_LIMIT) return text;
  return (
    text.slice(0, CHARACTER_LIMIT) +
    `\n\n... [truncated: response exceeded ${CHARACTER_LIMIT} characters — narrow your query with filters or pagination]`
  );
}
