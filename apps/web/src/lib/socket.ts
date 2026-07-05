import { io, type Socket } from "socket.io-client";

const WS_URL = import.meta.env.VITE_WS_URL ?? "http://localhost:4000";

let socket: Socket | undefined;

export function connectSocket(token: string): Socket {
  socket?.disconnect();
  socket = io(WS_URL, { autoConnect: true, transports: ["websocket"], auth: { token } });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = undefined;
}

export function getSocket(): Socket | undefined {
  return socket;
}
