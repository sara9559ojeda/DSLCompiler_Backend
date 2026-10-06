import { buildServer } from "./server.js";
import { HTTP_PORT, HTTP_HOST } from "../config/projects.config.js";

const server = buildServer();

server.listen({ port: HTTP_PORT, host: HTTP_HOST }).catch((error: unknown) => {
  server.log.error(error);
  process.exitCode = 1;
});
