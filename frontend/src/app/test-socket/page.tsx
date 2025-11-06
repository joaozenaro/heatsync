"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TestSocketPage() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ type: string; data: unknown; timestamp: string }>
  >([]);
  const [messageText, setMessageText] = useState("");

  const { socket, isConnected, error: socketError } = useSocket();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  useEffect(() => {
    if (!socket) return;

    socket.on("authenticated", (data) => {
      addMessage("authenticated", data);
    });

    socket.on("pong", (data) => {
      addMessage("pong", data);
    });

    socket.on("message", (data) => {
      addMessage("message", data);
    });

    socket.on("temperature", (data) => {
      addMessage("temperature", data);
    });

    return () => {
      socket.off("authenticated");
      socket.off("pong");
      socket.off("message");
      socket.off("temperature");
    };
  }, [socket]);

  const addMessage = (type: string, data: unknown) => {
    setMessages((prev) => [
      ...prev,
      {
        type,
        data,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      alert("Sign up successful! Check your email for confirmation.");
    } catch (error) {
      alert(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error) {
      alert(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMessages([]);
  };

  const handlePing = () => {
    if (socket && isConnected) {
      socket.emit("ping", { timestamp: new Date().toISOString() });
    }
  };

  const handleSendMessage = () => {
    if (socket && isConnected && messageText.trim()) {
      socket.emit("message", { text: messageText });
      setMessageText("");
    }
  };

  const handleGetTemperature = () => {
    if (socket && isConnected) {
      socket.emit("getTemperature");
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-4xl font-bold mb-8">
        Socket.IO + Supabase Auth Test
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Authentication Card */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              {user
                ? `Logged in as ${user.email}`
                : "Please sign in or sign up"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!user ? (
              <>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSignIn}
                    disabled={loading}
                    className="flex-1"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={handleSignUp}
                    disabled={loading}
                    variant="outline"
                    className="flex-1"
                  >
                    Sign Up
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">User ID:</p>
                  <p className="text-xs text-muted-foreground break-all">
                    {user.id}
                  </p>
                  <p className="text-sm font-medium mt-2">Email:</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Button
                  onClick={handleSignOut}
                  variant="destructive"
                  className="w-full"
                >
                  Sign Out
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* WebSocket Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>WebSocket Status</CardTitle>
            <CardDescription>Real-time connection status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connection:</span>
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            {socket && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Socket ID:</span>
                <span className="text-xs text-muted-foreground">
                  {socket.id || "N/A"}
                </span>
              </div>
            )}
            {socketError && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {socketError}
              </div>
            )}
            {!user && (
              <div className="p-3 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-lg text-sm">
                Please sign in to establish WebSocket connection
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
            <CardDescription>
              Send test messages through WebSocket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handlePing}
              disabled={!isConnected}
              className="w-full"
            >
              Send Ping
            </Button>
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                disabled={!isConnected}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!isConnected || !messageText.trim()}
              >
                Send
              </Button>
            </div>
            <Button
              onClick={handleGetTemperature}
              disabled={!isConnected}
              variant="outline"
              className="w-full"
            >
              Get Temperature
            </Button>
          </CardContent>
        </Card>

        {/* Messages Card */}
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            <CardDescription>Real-time messages from server</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No messages yet
                </p>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline">{msg.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(msg.data, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
            {messages.length > 0 && (
              <Button
                onClick={() => setMessages([])}
                variant="ghost"
                size="sm"
                className="w-full mt-2"
              >
                Clear Messages
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
