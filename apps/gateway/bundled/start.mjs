// Entrypoint of the `bundled` image (gateway + compiler in one container).
// Starts the compiler first, waits until its gRPC server is listening, then
// starts the gateway pointed at it over gRPC on loopback. If either process
// dies, the other is stopped and the container exits — the platform's
// restart policy brings both back together.
import { spawn } from "node:child_process";

const GRPC_PORT = process.env.EMBEDDED_COMPILER_GRPC_PORT ?? "50051";
const COMPILER_HTTP_PORT = process.env.EMBEDDED_COMPILER_HTTP_PORT ?? "4001";
const READY_MARKER = "gRPC listening";

const children = [];
let shuttingDown = false;

function start(name, script, env) {
  const child = spawn(process.execPath, [script], {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "inherit"],
  });
  child.stdout.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.on("exit", (code, signal) => {
    console.error(`[${name}] exited (code=${code}, signal=${signal})`);
    shutdown(code ?? 1);
  });
  children.push(child);
  return child;
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}

process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));

const compiler = start("compiler", "services/compiler/dist/http/main.js", {
  // The compiler's own HTTP API stays on loopback only; the gateway is the
  // container's single public port ($PORT).
  PORT: COMPILER_HTTP_PORT,
  HOST: "127.0.0.1",
  GRPC_ENABLED: "true",
  GRPC_HOST: "127.0.0.1",
  GRPC_PORT,
});

compiler.stdout.on("data", function onData(chunk) {
  if (!chunk.toString().includes(READY_MARKER)) return;
  compiler.stdout.off("data", onData);
  start("gateway", "apps/gateway/dist/main.js", {
    COMPILER_TRANSPORT: "grpc",
    COMPILER_GRPC_ADDRESS: `127.0.0.1:${GRPC_PORT}`,
  });
});
