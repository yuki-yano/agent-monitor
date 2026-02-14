import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";

import App from "./App";
import { SessionDetailPage } from "./pages/SessionDetail";
import { SessionListPage } from "./pages/SessionList";
import {
  DEFAULT_SESSION_LIST_FILTER,
  isSessionListFilter,
} from "./pages/SessionList/sessionListFilters";
import { normalizeSessionListSearchQuery } from "./pages/SessionList/sessionListSearch";

const rootRoute = createRootRoute({
  component: App,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: SessionListPage,
  validateSearch: (search: Record<string, unknown>) => {
    const filter = isSessionListFilter(search.filter) ? search.filter : DEFAULT_SESSION_LIST_FILTER;
    const q = normalizeSessionListSearchQuery(search.q);
    if (q.length === 0) {
      return { filter };
    }
    return { filter, q };
  },
});

const sessionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sessions/$paneId",
  component: SessionDetailPage,
});

const routeTree = rootRoute.addChildren([indexRoute, sessionDetailRoute]);

export const router = createRouter({
  routeTree,
  scrollRestoration: true,
  scrollToTopSelectors: ["#root"],
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
