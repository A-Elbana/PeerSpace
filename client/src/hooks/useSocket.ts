import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '../utils/auth';

let socketSingleton: Socket | null = null;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socketSingleton) {
      const token = getAccessToken();

      const wsFromEnv = (import.meta.env.VITE_WS_URL as string) || undefined;
      const apiFromEnv = (import.meta.env.VITE_API_URL as string) || undefined;

      const defaultWs = (() => {
        if (wsFromEnv) return wsFromEnv;
        if (apiFromEnv) {
          try {
            const parsed = new URL(apiFromEnv);
            return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
          } catch (e) {
            // fallthrough to explicit fallback
          }
        }
        return `${window.location.protocol}//localhost:3000`;
      })();

      socketSingleton = io(defaultWs, {
        auth: { token },
        transports: ['websocket'],
      });
    }

    socketRef.current = socketSingleton;

    return () => {
      // keep socket alive for app lifetime; don't disconnect on unmount
      socketRef.current = null;
    };
  }, []);

  return socketRef.current;
}
