/**
 * Client token middleware
 *
 * Rejects requests that do not carry the expected X-Client-Token header.
 * This is a lightweight defense-in-depth measure: it ensures requests
 * originate from the official frontend rather than direct API calls or
 * scrapers that do not know the shared secret.
 *
 * The token value is set via the CLIENT_TOKEN environment variable and
 * must match the NEXT_PUBLIC_CLIENT_TOKEN value configured in the frontend.
 */
const clientTokenMiddleware = (req, res, next) => {
  const expected = process.env.CLIENT_TOKEN;

  // If the env var is not configured, skip enforcement (dev fallback)
  if (!expected) return next();

  const provided = req.headers['x-client-token'];

  if (!provided || provided !== expected) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
};

export default clientTokenMiddleware;
