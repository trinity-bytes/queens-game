import type { LeaderboardRepository } from "./repository";
import { parseSubmission } from "./submission";

/** The board only ranks the standard grid. */
const RANKED_GRID_SIZE = 9;

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;

/**
 * A full solve log is about 165 KB (5000 placements), so this admits every
 * legitimate run and nothing much larger.
 */
const MAX_BODY_BYTES = 256 * 1024;

const MAX_USER_AGENT_LENGTH = 512;

const json = (body: unknown, status = 200, headers?: HeadersInit): Response =>
  Response.json(body, {
    status,
    headers: { "cache-control": "no-store", ...headers },
  });

function parseLimit(url: URL): number {
  const limit = Number(url.searchParams.get("limit"));
  return Number.isInteger(limit) && limit >= 1 && limit <= MAX_LIMIT
    ? limit
    : DEFAULT_LIMIT;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function listScores(
  request: Request,
  repository: LeaderboardRepository,
): Promise<Response> {
  const limit = parseLimit(new URL(request.url));
  return json(await repository.topScores(RANKED_GRID_SIZE, limit));
}

async function submitScore(
  request: Request,
  repository: LeaderboardRepository,
): Promise<Response> {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return json({ error: "submission too large" }, 413);
  }

  const parsed = parseSubmission(parseJson(text));
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  // Taken from the request rather than the body: the header is what actually
  // arrived, and the body is whatever the client chose to claim.
  const userAgent =
    request.headers.get("user-agent")?.slice(0, MAX_USER_AGENT_LENGTH) ?? null;

  const id = await repository.save(parsed.value, userAgent);
  return json({ id }, 201);
}

export async function handleLeaderboard(
  request: Request,
  repository: LeaderboardRepository,
): Promise<Response> {
  try {
    switch (request.method) {
      case "GET":
        return await listScores(request, repository);
      case "POST":
        return await submitScore(request, repository);
      default:
        return json({ error: "method not allowed" }, 405, {
          allow: "GET, POST",
        });
    }
  } catch (error) {
    // Logged for `wrangler tail`; the detail never reaches the client.
    console.error("Leaderboard request failed:", error);
    return json({ error: "internal error" }, 500);
  }
}
