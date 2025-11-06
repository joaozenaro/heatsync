"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Socket } from "socket.io-client";
import { createSocketConnection } from "@/lib/socket";
import { createClient } from "@/lib/supabase/client";

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  error: string | null;
  sendMessage: (event: string, data: unknown) => void;
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const initSocket = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("No authentication token available");
        return;
      }

      const newSocket = createSocketConnection({
        token: session.access_token,
      });

      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
        setIsConnected(true);
        setError(null);
      });

      newSocket.on("disconnect", () => {
        console.log("Socket disconnected");
        setIsConnected(false);
      });

      newSocket.on("authenticated", (data) => {
        console.log("Socket authenticated:", data);
      });

      newSocket.on("error", (err) => {
        console.error("Socket error:", err);
        setError(err.message || "Socket connection error");
      });

      newSocket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
        setError(err.message || "Failed to connect to server");
      });

      newSocket.connect();

      socketRef.current = newSocket;
      setSocket(newSocket);
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const sendMessage = useCallback(
    (event: string, data: unknown) => {
      if (socket && isConnected) {
        socket.emit(event, data);
      } else {
        console.warn("Socket not connected, cannot send message");
      }
    },
    [socket, isConnected]
  );

  return {
    socket,
    isConnected,
    error,
    sendMessage,
  };
}
