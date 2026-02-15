import { QueryClient } from "@tanstack/react-query";

const QUERY_GC_TIME_MS = 5 * 60 * 1000;

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: QUERY_GC_TIME_MS,
        retry: false,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

export const queryClient = createQueryClient();
