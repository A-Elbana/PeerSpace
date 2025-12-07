import cors from "cors";

/**
 * CORS configuration for production
 * Restrict to specific frontend domains
 */
export const corsOptions = {
  // Allow requests from these origins
  origin: (origin: string | undefined, callback: Function) => {
    // Allowed domains - update based on your frontend URLs
    const allowedOrigins = [
      "http://localhost:5173", // Vite dev server
      "http://localhost:3000", // Alternative dev port
      "http://localhost:5174",
      process.env.FRONTEND_URL, // Production frontend URL
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
