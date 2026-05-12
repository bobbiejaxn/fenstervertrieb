export const DEFAULT_MAX_ITERATIONS = 20;
export const SOFT_WARNING_BUFFER = 5;
export const MAX_TASK_ATTEMPTS = 2;
export const MAX_CONSECUTIVE_NO_PROGRESS = 3;

export const CEO_CONTEXT_TOKEN_BUDGET = 64000;
export const WORKER_CONTEXT_TOKEN_BUDGET = 32000;
export const DECISIONS_SUMMARY_THRESHOLD = 10;
export const DECISIONS_TOKEN_THRESHOLD = 8000;

export const VERIFICATION_CONFIDENCE_THRESHOLD = 80;

// CEO reasoning model — configurable via env var. Defaults to zai/glm-5.1
// (Ollama Cloud). Set CEO_MODEL to override, e.g. "anthropic/claude-opus-4-6".
export const CEO_MODEL = process.env.CEO_MODEL || "zai/glm-5.1";

export const SESSIONS_DIR = ".pi/ceo-sessions";
export const LATEST_SESSION_FILE = "latest.json";

export const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/g,
  /ghp_[a-zA-Z0-9]{36}/g,
  /Bearer\s+eyJ[a-zA-Z0-9._\-]+/g,
  /AKIA[0-9A-Z]{16}/g,
  /password\s*[:=]\s*["'][^"']+["']/gi,
];
