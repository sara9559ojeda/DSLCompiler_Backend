import { buildServer } from "./server.js";
import { buildGrpcServer, startGrpcServer } from "../grpc/server.js";
import { CompilerApplication } from "../application/CompilerApplication.js";
import { HTTP_PORT, HTTP_HOST } from "../config/http.config.js";
import { GRPC_ENABLED, GRPC_HOST, GRPC_PORT } from "../config/grpc.config.js";

// Process entrypoint (kept at this path so the Dockerfile/render.yaml start
// command didn't change): one CompilerApplication, served over HTTP and —
// unless GRPC_ENABLED=false — over gRPC on its own port.
const app = new CompilerApplication();
const server = buildServer(app);

server.listen({ port: HTTP_PORT, host: HTTP_HOST }).catch((error: unknown) => {
  server.log.error(error);
  process.exitCode = 1;
});

if (GRPC_ENABLED) {
  startGrpcServer(buildGrpcServer(app), GRPC_HOST, GRPC_PORT)
    .then((port) => console.log(`gRPC listening on ${GRPC_HOST}:${port}`))
    .catch((error: unknown) => {
      console.error("gRPC server failed to start", error);
      process.exitCode = 1;
    });
}
