import { useEffect, useRef } from "react";
import { getSocket } from "../lib/socket";

/**
 * Subscribes to a Socket.IO event for the lifetime of the component. The
 * handler is called through a ref so the effect only needs to depend on
 * `event` - an inline arrow function passed as `handler` won't cause a
 * resubscribe on every render.
 */
export function useSocketEvent<T = unknown>(event: string, handler: (payload: T) => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const listener = (payload: T) => handlerRef.current(payload);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [event]);
}
