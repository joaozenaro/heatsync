import { io, Socket } from "socket.io-client";

export interface SocketOptions {
  token: string;
}

export function createSocketConnection(options: SocketOptions): Socket {
  const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
    auth: {
      token: options.token,
    },
    autoConnect: false,
  });

  return socket;
}
