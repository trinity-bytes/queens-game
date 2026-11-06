import type { LeaderboardRepository } from "./repository";
import { parseSubmission, RANKED_GRID_SIZE } from "./submission";

/** The part of the Workers rate limit binding this layer uses. */
export type SubmissionLimiter = Pick<RateLimit, "limit">;

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;

/**
 * A full solve log is about 165 KB (5000 placements), so this admits every
 * legitimate run and nothing much larger.
 */
const MAX_BODY_BYTES = 256 * 1024;

const MAX_USER_AGENT_LENGTH = 512;

/** Matches the period of the binding in wrangler.jsonc. */
const RATE_LIMIT_PERIOD_SECONDS = 60;

const json = (body: unknown, status = 200, headers?: HeadersInit): Response =>
  Response.json(body, {
    status,
    headers: { "cache-control": "no-store", ...headers },
  });

/** Null when a limit was given but is unusable: it is not silently replaced. */
function parseLimit(url: URL): number | null {
  const raw = url.searchParams.get("limit");
  if (raw === null) return DEFAULT_LIMIT;

  const limit = Number(raw);
  return /^\d+$/.test(raw) && limit >= 1 && limit <= MAX_LIMIT ? limit : null;
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
  if (limit === null) return json({ error: "invalid limit" }, 400);

  return json(await repository.topScores(RANKED_GRID_SIZE, limit));
}

async function submitScore(
  request: Request,
  repository: LeaderboardRepository,
  limiter?: SubmissionLimiter,
): Promise<Response> {
  // Players are anonymous, so the address is the only key there is. Limits are
  // counted per Cloudflare location, which is enough to stop a flood.
  const key = request.headers.get("cf-connecting-ip");
  if (limiter && key && !(await limiter.limit({ key })).success) {
    return json({ error: "too many submissions" }, 429, {
      "retry-after": String(RATE_LIMIT_PERIOD_SECONDS),
    });
  }

  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return json({ error: "unsupported media type" }, 415);
  }

  // Answered from the header when it is honest, before the body is buffered.
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return json({ error: "submission too large" }, 413);
  }

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
  return json({ id }, id === null ? 200 : 201);
}

export async function handleLeaderboard(
  request: Request,
  repository: LeaderboardRepository,
  limiter?: SubmissionLimiter,
): Promise<Response> {
  try {
    switch (request.method) {
      case "GET":
        return await listScores(request, repository);
      case "POST":
        return await submitScore(request, repository, limiter);
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
