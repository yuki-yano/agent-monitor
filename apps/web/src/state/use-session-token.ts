import { useEffect, useState } from "react";

const TOKEN_KEY = "vde-monitor-token";

const readTokenFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    params.delete("token");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", next);
  }
  return token;
};

export const useSessionToken = () => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });

  useEffect(() => {
    const urlToken = readTokenFromUrl();
    if (urlToken && urlToken !== token) {
      setToken(urlToken);
    }
  }, [token]);

  return { token, setToken };
};
