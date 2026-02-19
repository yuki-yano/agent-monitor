import type { ReactNode } from "react";

type SessionDetailProviderProps = {
  paneId: string;
  children: ReactNode;
};

export const SessionDetailProvider = ({ paneId, children }: SessionDetailProviderProps) => {
  void paneId;
  return <>{children}</>;
};
