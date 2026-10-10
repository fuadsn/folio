declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_PRICE_ID?: string;
    STRIPE_WEBHOOK_SECRET?: string;
  }
}
