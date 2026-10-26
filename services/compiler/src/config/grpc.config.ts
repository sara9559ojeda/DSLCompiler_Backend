/** gRPC listener settings. GRPC_ENABLED=false runs the service as HTTP-only. */
export const GRPC_ENABLED = (process.env.GRPC_ENABLED ?? "true") !== "false";
export const GRPC_PORT = Number(process.env.GRPC_PORT ?? 50051);
export const GRPC_HOST = process.env.GRPC_HOST ?? "0.0.0.0";
