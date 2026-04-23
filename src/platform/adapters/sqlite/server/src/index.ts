import express from "express";
import cors from "cors";
import { initializeDatabase } from "./db.js";
import { registerBranchesRoutes } from "./routes/branches.js";
import { registerDepartmentsRoutes } from "./routes/departments.js";
import { registerUsersRoutes } from "./routes/users.js";
import { registerActionDefinitionsRoutes } from "./routes/actionDefinitions.js";
import { registerOtherRoutes } from "./routes/other.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
const db = initializeDatabase();
console.log("✓ Database initialized");

// Create a router for all API routes
const router = express.Router();

// Register routes
registerBranchesRoutes(router, db);
registerDepartmentsRoutes(router, db);
registerUsersRoutes(router, db);
registerActionDefinitionsRoutes(router, db);
registerOtherRoutes(router, db);

// Mount router
app.use(router);

// Health check endpoint
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
