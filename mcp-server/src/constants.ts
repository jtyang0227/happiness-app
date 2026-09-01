/** Base URL of the Happiness backend's public REST API. Override for non-local environments. */
export const API_BASE_URL = process.env.HAPPINESS_API_URL || "http://localhost:8080/api";

/** Maximum characters returned in a single tool response before truncation. */
export const CHARACTER_LIMIT = 25000;
