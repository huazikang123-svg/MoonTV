// Read a Pages runtime secret from Cloudflare's request context when available.
// Fall back to Node process.env for local development and non-Cloudflare hosting.
import { getOptionalRequestContext } from '@cloudflare/next-on-pages';

export function getRuntimePassword(): string | undefined {
  const context = getOptionalRequestContext();
  const cloudflareEnv = context?.env as { PASSWORD?: unknown } | undefined;
  const password = cloudflareEnv?.PASSWORD ?? process.env.PASSWORD;

  return typeof password === 'string' && password.length > 0
    ? password
    : undefined;
}
