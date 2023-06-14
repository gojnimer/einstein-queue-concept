import { useEffect, useRef } from "react";
import io from "socket.io-client";

const useSocketIO = (serverUrl) => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(serverUrl);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [serverUrl]);

  const addListener = (event, callback) => {
    socketRef?.current?.on(event, callback);
  };

  const removeListener = (event) => {
    socketRef?.current?.off(event);
  };

  const emitEvent = (event, data) => {
    return new Promise((resolve, reject) => {
      socketRef?.current?.emit(event, data, (response) => {
        resolve(response);
      });
    });
  };

  return {
    addListener,
    removeListener,
    emitEvent,
  };
};

export default useSocketIO;
