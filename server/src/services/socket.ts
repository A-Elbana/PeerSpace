import { Server as HttpServer } from "http";
import { Server as IOServer, Socket as IOSocket } from "socket.io";
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

let io: IOServer | null = null;

export function initSocket(server: HttpServer) {
  if (io) return io;

  io = new IOServer(server, {
    cors: {
      origin: true,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket: IOSocket) => {
    console.log("socket connected:", socket.id);

    // Optionally authenticate socket using token passed in handshake.auth.token
    const token = (socket.handshake.auth && (socket.handshake.auth as any).token) || null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded && decoded.userId) {
          socket.data.userId = decoded.userId;
          const room = `user:${decoded.userId}`;
          socket.join(room);
          console.log(`Socket ${socket.id} joined room ${room}`);
        }
      } catch (err) {
        console.debug("Socket auth failed:", err);
      }
    }

    socket.on("subscribe", (userId: number) => {
      try {
        const room = `user:${userId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} subscribed to ${room}`);
      } catch (err) {
        console.error("subscribe error", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("socket disconnected:", socket.id);
    });
  });

  return io;
}

export function getIo() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
