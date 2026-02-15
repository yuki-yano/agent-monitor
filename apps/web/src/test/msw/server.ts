import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const server = setupServer();

export { http, HttpResponse };
