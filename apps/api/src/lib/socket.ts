import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { env } from "../config/env";
import { verifyToken } from "./jwt";
import { logger } from "./logger";

let io: SocketIOServer | undefined;

export function orgRoom(orgId: string): string {
  return `org:${orgId}`;
}

/**
 * Clients authenticate with their JWT over the Socket.IO handshake (not a
 * query param, to avoid the token ending up in server access logs), and
 * are joined to a room scoped to their org so broadcasts never cross
 * tenant boundaries - the same isolation every REST endpoint already
 * enforces, just for the push channel.
 */
export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.CORS_ORIGIN },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error("Missing auth token"));
      return;
    }
    try {
      const payload = verifyToken(token);
      socket.data.orgId = payload.orgId;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const orgId = socket.data.orgId as string;
    socket.join(orgRoom(orgId));
    logger.debug({ socketId: socket.id, orgId }, "Socket connected");
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.IO server has not been initialized yet");
  }
  return io;
}
