declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    SUBMISSION_LIMITER: RateLimit;
    TEST_MIGRATIONS: D1Migration[];
  }
}
