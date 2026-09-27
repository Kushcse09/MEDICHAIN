import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";

import authRoutes from "./routes/auth.js";
import recordRoutes from "./routes/records.js";
import accessRoutes from "./routes/access.js";
import auditRoutes from "./routes/audit.js";
import aiRoutes from "./routes/ai.js";
import shieldRoutes from "./routes/shield.js";

dotenv.config();

const app = express();

// Security headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", process.env.ALLOWED_ORIGINS || "*"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
  })
);

app.use(cors());
app.use(express.json());

// Root endpoint with API documentation
app.get("/", (req, res) => {
  res.json({
    name: "MediChain Shield Backend API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/health",
      legacy: {
        auth: "/api/auth/*",
        records: "/api/records/*",
        access: "/api/access/*",
        audit: "/api/audit/*",
        ai: "/api/ai/*"
      },
      shield: {
        storage: "/shield/storage/*",
        audit: "/shield/audit/*",
        ai: "/shield/ai/*"
      }
    },
    documentation: "See README.md for full API documentation"
  });
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Existing routes (unchanged)
app.use("/api/auth", authRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/ai", aiRoutes);

// Shield routes (new)
app.use("/shield", shieldRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`MediChain Shield backend running on http://localhost:${PORT}`);
  console.log(`API endpoints: /api/* (legacy)  /shield/* (shield)`);
});
