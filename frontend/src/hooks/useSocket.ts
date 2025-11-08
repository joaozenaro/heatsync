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
  reconnect: () => void;
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setError("Max reconnection attempts reached. Please refresh the page.");
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = Math.min(
      1000 * Math.pow(2, reconnectAttemptsRef.current),
      30000
    );
    reconnectAttemptsRef.current += 1;

    console.log(
      `Scheduling reconnect attempt ${reconnectAttemptsRef.current} in ${delay}ms`
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      // Will call initSocket when it's available
      socketRef.current?.connect();
    }, delay);
  }, []);

  const initSocket = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError("No authentication token available");
      return;
    }

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    const newSocket = createSocketConnection({
      token: session.access_token,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);

      if (reason === "io server disconnect") {
        scheduleReconnect();
      }
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
      scheduleReconnect();
    });

    newSocket.connect();

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, [scheduleReconnect]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    initSocket();
  }, [initSocket]);

  useEffect(() => {
    // Wrap in async IIFE to avoid direct setState in effect
    void (async () => {
      await initSocket();
    })();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [initSocket]);

  // Handle tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Tab became visible, checking connection...");
        if (!isConnected && socketRef.current) {
          reconnect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isConnected, reconnect]);

  // Handle window focus events
  useEffect(() => {
    const handleFocus = () => {
      console.log("Window focused, checking connection...");
      if (!isConnected && socketRef.current) {
        reconnect();
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [isConnected, reconnect]);

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
    reconnect,
  };
}
