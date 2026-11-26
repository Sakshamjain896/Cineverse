import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
========================================
       CINEVERSE API SERVER
========================================
  Status : Running
  Port   : ${PORT}
  URL    : http://localhost:${PORT}
========================================
  `);
});

process.on("SIGINT", () => {
  console.log("\nShutting down Cineverse API...");
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
