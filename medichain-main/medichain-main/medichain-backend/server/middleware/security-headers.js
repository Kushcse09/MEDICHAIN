/**
 * MediChain Shield - Security Headers Middleware
 * 
 * Implements defense-in-depth HTTP security headers:
 * - Helmet for standard security headers
 * - Strict CORS configuration
 * - Request ID tracking
 * - CSP, HSTS, X-Frame-Options, etc.
 */

const helmet = require("helmet");
const crypto = require("crypto");

/**
 * Configure Helmet security headers
 */
function configureHelmet() {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for UI
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", process.env.ALLOWED_ORIGINS || "*"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },

    // HTTP Strict Transport Security (HSTS)
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },

    // X-Content-Type-Options: nosniff
    noSniff: true,

    // X-Frame-Options: DENY
    frameguard: {
      action: "deny",
    },

    // Referrer-Policy
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },

    // Remove X-Powered-By header
    hidePoweredBy: true,

    // X-DNS-Prefetch-Control
    dnsPrefetchControl: {
      allow: false,
    },
  });
}

/**
 * CORS middleware with strict origin validation
 */
function configureCORS() {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:3000", "http://localhost:3001"];

  return (req, res, next) => {
    const origin = req.headers.origin;

    // Check if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else if (process.env.NODE_ENV === "development") {
      // In development, allow all origins (with warning)
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
      if (origin && !allowedOrigins.includes(origin)) {
        console.warn(`[WARN] CORS: Origin ${origin} not in allowed list (dev mode)`);
      }
    } else {
      // Production: reject unauthorized origins
      if (origin && !allowedOrigins.includes(origin)) {
        return res.status(403).json({
          error: "Forbidden",
          message: "CORS: Origin not allowed",
        });
      }
    }

    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, X-Request-ID"
    );
    res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours

    // Handle preflight
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    next();
  };
}

/**
 * Request ID middleware
 * Generates and attaches unique request IDs for tracing
 */
function requestId() {
  return (req, res, next) => {
    // Use existing request ID if provided, otherwise generate
    const requestId =
      req.headers["x-request-id"] || crypto.randomUUID();

    // Attach to request
    req.id = requestId;

    // Send in response header
    res.setHeader("X-Request-ID", requestId);

    next();
  };
}

/**
 * Additional security headers
 */
function additionalHeaders() {
  return (req, res, next) => {
    // Permissions-Policy (formerly Feature-Policy)
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=(), payment=()"
    );

    // X-XSS-Protection (legacy browsers)
    res.setHeader("X-XSS-Protection", "1; mode=block");

    next();
  };
}

/**
 * Combined security middleware stack
 */
function securityMiddleware() {
  return [
    requestId(),
    configureHelmet(),
    configureCORS(),
    additionalHeaders(),
  ];
}

module.exports = {
  securityMiddleware,
  requestId,
  configureCORS,
  configureHelmet,
  additionalHeaders,
};
