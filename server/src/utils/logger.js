import crypto from "node:crypto";
import pino from "pino";
import pinoHttp from "pino-http";
import { env } from "../config/env.js";

const SAFE_REQUEST_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;

export const logger = pino({
  level: env.LOG_LEVEL || (env.isTest ? "silent" : "info"),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.refreshToken",
      "*.accessToken",
    ],
    censor: "[REDACTED]",
  },
});

export const httpLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const incoming = req.headers["x-request-id"];
    const requestId =
      typeof incoming === "string" && SAFE_REQUEST_ID_RE.test(incoming)
        ? incoming
        : crypto.randomUUID();
    res.setHeader("X-Request-Id", requestId);
    return requestId;
  },
  customLogLevel(_req, res, err) {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});
