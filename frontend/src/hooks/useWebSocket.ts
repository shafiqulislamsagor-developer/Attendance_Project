import { useCallback, useEffect, useRef, useState } from "react";

interface WSMessage<T> {
  type: string;
  data: T;
  timestamp: string;
}

interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  error?: string;
}

export function useWebSocket(url: string, token: string) {
  const ws = useRef<WebSocket | null>(null);
  const [state, setState] = useState<ConnectionState>({
    connected: false,
    connecting: false,
  });
  const [messages, setMessages] = useState<WSMessage<any>[]>([]);
  const messageHandlers = useRef<Map<string, (data: any) => void>>(new Map());

  useEffect(() => {
    if (!token) return;

    setState((prev) => ({ ...prev, connecting: true }));

    try {
      const wsUrl = new URL(url, window.location.href);
      wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";

      ws.current = new WebSocket(wsUrl.toString());

      ws.current.onopen = () => {
        console.log("WebSocket connected");
        setState({
          connected: true,
          connecting: false,
        });
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WSMessage<any> = JSON.parse(event.data);
          setMessages((prev) => [...prev, message]);

          // Call registered handlers for this message type
          const handler = messageHandlers.current.get(message.type);
          if (handler) {
            handler(message.data);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setState({
          connected: false,
          connecting: false,
          error: "WebSocket error occurred",
        });
      };

      ws.current.onclose = () => {
        console.log("WebSocket disconnected");
        setState({
          connected: false,
          connecting: false,
          error: "Disconnected from server",
        });

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (token) {
            ws.current = null;
          }
        }, 3000);
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      setState({
        connected: false,
        connecting: false,
        error: String(error),
      });
    }

    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [url, token]);

  const subscribe = useCallback(
    (messageType: string, handler: (data: any) => void) => {
      messageHandlers.current.set(messageType, handler);

      return () => {
        messageHandlers.current.delete(messageType);
      };
    },
    [],
  );

  const send = useCallback((data: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  return {
    state,
    messages,
    subscribe,
    send,
  };
}
