import { d1Repository } from "./leaderboard/d1Repository";
import { handleLeaderboard } from "./leaderboard/routes";

interface Env {
  DB: D1Database;
  SUBMISSION_LIMITER: RateLimit;
}

/**
 * Only /api/* reaches this Worker (see run_worker_first in wrangler.jsonc).
 * Everything else is the static export, served by the asset store.
 */
const worker = {
  fetch(request: Request, env: Env): Promise<Response> | Response {
    if (new URL(request.url).pathname === "/api/leaderboard") {
      return handleLeaderboard(
        request,
        d1Repository(env.DB),
        env.SUBMISSION_LIMITER,
      );
    }
    return Response.json({ error: "not found" }, { status: 404 });
  },
};

export default worker;
