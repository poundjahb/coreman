import express from "express";
import cors from "cors";
import session from "express-session";
import ConnectSQLite from "connect-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { initializeDatabase } from "./db.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerBranchesRoutes } from "./routes/branches.js";
import { registerDepartmentsRoutes } from "./routes/departments.js";
import { registerUsersRoutes } from "./routes/users.js";
import { registerActionDefinitionsRoutes } from "./routes/actionDefinitions.js";
import { registerAssignmentsRoutes } from "./routes/assignments.js";
import { registerOtherRoutes } from "./routes/other.js";

// Extend express-session with our custom property
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");

const SQLiteStore = ConnectSQLite(session);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — allow credentials so session cookies are sent cross-origin (dev: localhost:5173 → :3001)
app.use(cors({
  origin: process.env.COREMAN_FRONTEND_BASE_URL ?? process.env.VITE_APP_BASE_URL ?? "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

// Session middleware — tab-session cookie (no maxAge → destroyed when browser/tab closes)
const sessionSecret = process.env.COREMAN_SESSION_SECRET ?? "coreman-dev-secret-change-in-production";
app.use(session({
  store: new SQLiteStore({ dir: dataDir, db: "coreman.db", table: "sessions" }) as session.Store,
  name: "coreman.sid",
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false  // Set to true in production behind HTTPS
  }
}));

// Initialize database
const db = initializeDatabase();
console.log("✓ Database initialized");

// Create a router for all API routes
const router = express.Router();

// Auth routes (public — must be registered BEFORE the auth guard)
registerAuthRoutes(router, db);

// Auth guard — all /api/* routes below this point require a valid session
router.use("/api", (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Auth routes are already registered above and handled first
  if (req.path.startsWith("/auth/")) {
    next();
    return;
  }
  if (!req.session.userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  next();
});

// Application routes (protected)
registerBranchesRoutes(router, db);
registerDepartmentsRoutes(router, db);
registerUsersRoutes(router, db);
registerActionDefinitionsRoutes(router, db);
registerAssignmentsRoutes(router, db);
registerOtherRoutes(router, db);

// Mount router
app.use(router);

// Health check endpoint (public)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ API endpoints available at http://localhost:${PORT}/api/*`);
  console.log(`\nPress Ctrl+C to stop\n`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\nShutting down gracefully...");
  db.close();
  process.exit(0);
});

