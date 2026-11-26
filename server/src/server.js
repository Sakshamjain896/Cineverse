import app from "./app.js";
import { env } from "./config/env.js";
import { disconnectDatabase } from "./database/prisma.js";
import { logger } from "./utils/logger.js";

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      environment: env.NODE_ENV,
      allowedOrigins: env.allowedOrigins,
    },
    `Cineverse API listening on http://localhost:${env.PORT}`,
  );
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Shutting down Cineverse API...");

  const forceTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out; forcing exit.");
    process.exit(1);
  }, 10_000);
  forceTimer.unref();

  server.close(async (closeErr) => {
    try {
      await disconnectDatabase();
      if (closeErr) {
        logger.error({ err: closeErr }, "Error closing HTTP server");
        process.exit(1);
      }
      process.exit(0);
    } catch (dbErr) {
      logger.error({ err: dbErr }, "Error disconnecting database");
      process.exit(1);
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  shutdown("uncaughtException");
});
