import { buildServer } from "./server.js";
import { PORT, HOST } from "./config/gateway.config.js";

buildServer()
  .then((server) => server.listen({ port: PORT, host: HOST }))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
