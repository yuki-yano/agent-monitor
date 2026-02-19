import type { ReactNode } from "react";

type SessionDetailProviderProps = {
  paneId: string;
  children: ReactNode;
};

export const SessionDetailProvider = (props: SessionDetailProviderProps) => {
  return <>{props.children}</>;
};
