/**
 * Single entry point for the gRPC contracts. Both the compiler service
 * (server) and the gateway (client) load the .proto files through here, so
 * the loader options — which must match the ones used for codegen in
 * package.json's `generate` script — live in exactly one place.
 *
 * The types under ./generated are produced by `npm run generate`
 * (proto-loader-gen-types) and checked in; CI regenerates them and fails
 * if the result differs from what's committed.
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import type { ProtoGrpcType as CompilerProto } from "./generated/compiler.js";
import type { ProtoGrpcType as ExportProto } from "./generated/export.js";

export type { CompilerServiceHandlers, CompilerServiceClient } from "./generated/compiler/v1/CompilerService.js";
export type { ExportServiceHandlers, ExportServiceClient } from "./generated/export/v1/ExportService.js";
export type { Diagnostic as GrpcDiagnostic, Diagnostic__Output as GrpcDiagnosticOutput } from "./generated/compiler/v1/Diagnostic.js";
export type { CompileResponse__Output } from "./generated/compiler/v1/CompileResponse.js";
export type { CompilationStagesResponse__Output } from "./generated/compiler/v1/CompilationStagesResponse.js";
export type { ExportResponse__Output } from "./generated/export/v1/ExportResponse.js";
export type { ExportFormat as GrpcExportFormat } from "./generated/export/v1/ExportFormat.js";
export type { Severity as GrpcSeverity } from "./generated/compiler/v1/Severity.js";

/** Works from both src/ (tsx) and dist/ (node): the proto/ folder sits next to either. */
const PROTO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "proto");

const LOADER_OPTIONS: protoLoader.Options = {
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [PROTO_ROOT],
};

/** 4 MiB in, 16 MiB out: a DSL program is tiny, but a PNG export can be large. */
export const GRPC_MAX_RECEIVE_BYTES = 4 * 1024 * 1024;
export const GRPC_MAX_SEND_BYTES = 16 * 1024 * 1024;

export const GRPC_CHANNEL_OPTIONS: grpc.ChannelOptions = {
  "grpc.max_receive_message_length": GRPC_MAX_SEND_BYTES,
  "grpc.max_send_message_length": GRPC_MAX_RECEIVE_BYTES,
};

export const GRPC_SERVER_OPTIONS: grpc.ServerOptions = {
  "grpc.max_receive_message_length": GRPC_MAX_RECEIVE_BYTES,
  "grpc.max_send_message_length": GRPC_MAX_SEND_BYTES,
};

export interface LoadedContracts {
  readonly compiler: CompilerProto["compiler"]["v1"];
  readonly export: ExportProto["export"]["v1"];
}

export function loadContracts(): LoadedContracts {
  const definition = protoLoader.loadSync(["compiler/v1/compiler.proto", "export/v1/export.proto"], LOADER_OPTIONS);
  const loaded = grpc.loadPackageDefinition(definition) as unknown as CompilerProto & ExportProto;
  return { compiler: loaded.compiler.v1, export: loaded.export.v1 };
}

export { grpc };
