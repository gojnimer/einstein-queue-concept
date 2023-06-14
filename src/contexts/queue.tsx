"use client";

import useSocketIO from "@/hooks/useQueue";
import React, { ReactNode, createContext, useContext, useState } from "react";

interface IQueueContext {
  socket: any;
}

const QueueContext = createContext<IQueueContext>({
  socket: null,
});

const useQueueContext = () => useContext(QueueContext);

interface IProps {
  children: ReactNode;
}

const QueueContextProvider = ({ children }: IProps) => {
  const socket = useSocketIO(process.env.NEXT_PUBLIC_BACKEND_URL);
  return (
    <QueueContext.Provider
      value={{
        socket,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};

export { useQueueContext, QueueContextProvider };
