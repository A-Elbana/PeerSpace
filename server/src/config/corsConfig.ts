import cors from "cors";

/**
 * CORS configuration for production
 * Restrict to specific frontend domains
 */
export const corsOptions = {
  // Allow requests from these origins
  origin: (origin: string | undefined, callback: Function) => {
    // In production, we strictly use FRONTEND_URL environment variable
    // In development, we allow localhost variants
    const envOrigins = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
      : [];

    const allowedOrigins = [
      ...envOrigins,
      "https://peer-space-mocha.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:5174",
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, curl requests, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS not allowed for origin: ${origin}`));
    }
  },

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Allowed HTTP methods
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  // Allowed headers
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],

  // Exposed headers (client can access these)
  exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],

  // Max age for CORS preflight cache (in seconds)
  maxAge: 86400, // 24 hours

  // Allow implicit credentials with wildcard origins (disabled for security)
  optionsSuccessStatus: 200,
};

/**
 * Development CORS options (permissive)
 * Only use in development
 */
export const devCorsOptions = {
  origin: "*",
  credentials: false,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["*"],
  maxAge: 3600,
};

/**
 * Get appropriate CORS configuration based on environment
 */
export const getCorsConfig = () => {
  if (process.env.NODE_ENV === "development") {
    return devCorsOptions;
  }
  return corsOptions;
};
