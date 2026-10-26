// Original file: proto/compiler/v1/compiler.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { AnalyzeRequest as _compiler_v1_AnalyzeRequest, AnalyzeRequest__Output as _compiler_v1_AnalyzeRequest__Output } from '../../compiler/v1/AnalyzeRequest.js';
import type { AnalyzeResponse as _compiler_v1_AnalyzeResponse, AnalyzeResponse__Output as _compiler_v1_AnalyzeResponse__Output } from '../../compiler/v1/AnalyzeResponse.js';
import type { CompilationStagesRequest as _compiler_v1_CompilationStagesRequest, CompilationStagesRequest__Output as _compiler_v1_CompilationStagesRequest__Output } from '../../compiler/v1/CompilationStagesRequest.js';
import type { CompilationStagesResponse as _compiler_v1_CompilationStagesResponse, CompilationStagesResponse__Output as _compiler_v1_CompilationStagesResponse__Output } from '../../compiler/v1/CompilationStagesResponse.js';
import type { CompileRequest as _compiler_v1_CompileRequest, CompileRequest__Output as _compiler_v1_CompileRequest__Output } from '../../compiler/v1/CompileRequest.js';
import type { CompileResponse as _compiler_v1_CompileResponse, CompileResponse__Output as _compiler_v1_CompileResponse__Output } from '../../compiler/v1/CompileResponse.js';

export interface CompilerServiceClient extends grpc.Client {
  Analyze(argument: _compiler_v1_AnalyzeRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_compiler_v1_AnalyzeResponse__Output>): grpc.ClientUnaryCall;
  Analyze(argument: _compiler_v1_AnalyzeRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_compiler_v1_AnalyzeResponse__Output>): grpc.ClientUnaryCall;
  Analyze(argument: _compiler_v1_AnalyzeRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_compiler_v1_AnalyzeResponse__Output>): grpc.ClientUnaryCall;
  Analyze(argument: _compiler_v1_AnalyzeRequest, callback: grpc.requestCallback<_compiler_v1_AnalyzeResponse__Output>): grpc.ClientUnaryCall;
  analyze(argument: _compiler_v1_AnalyzeRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_compiler_v1_AnalyzeResponse__Output>): grpc.ClientUnaryCall;
  analyze(argument: _compiler_v1_AnalyzeRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_compiler_v1_AnalyzeResponse__Output>): grpc.ClientUnaryCall;
  analyze(argument: _compiler_v1_AnalyzeRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_compiler_v1_AnalyzeResponse__Output>): grpc.ClientUnaryCall;
  analyze(argument: _compiler_v1_AnalyzeRequest, callback: grpc.requestCallback<_compiler_v1_AnalyzeResponse__Output>): grpc.ClientUnaryCall;
  
  Compile(argument: _compiler_v1_CompileRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_compiler_v1_CompileResponse__Output>): grpc.ClientUnaryCall;
  Compile(argument: _compiler_v1_CompileRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_compiler_v1_CompileResponse__Output>): grpc.ClientUnaryCall;
  Compile(argument: _compiler_v1_CompileRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_compiler_v1_CompileResponse__Output>): grpc.ClientUnaryCall;
  Compile(argument: _compiler_v1_CompileRequest, callback: grpc.requestCallback<_compiler_v1_CompileResponse__Output>): grpc.ClientUnaryCall;
  compile(argument: _compiler_v1_CompileRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_compiler_v1_CompileResponse__Output>): grpc.ClientUnaryCall;
  compile(argument: _compiler_v1_CompileRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_compiler_v1_CompileResponse__Output>): grpc.ClientUnaryCall;
  compile(argument: _compiler_v1_CompileRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_compiler_v1_CompileResponse__Output>): grpc.ClientUnaryCall;
  compile(argument: _compiler_v1_CompileRequest, callback: grpc.requestCallback<_compiler_v1_CompileResponse__Output>): grpc.ClientUnaryCall;
  
  GetCompilationStages(argument: _compiler_v1_CompilationStagesRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_compiler_v1_CompilationStagesResponse__Output>): grpc.ClientUnaryCall;
  GetCompilationStages(argument: _compiler_v1_CompilationStagesRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_compiler_v1_CompilationStagesResponse__Output>): grpc.ClientUnaryCall;
  GetCompilationStages(argument: _compiler_v1_CompilationStagesRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_compiler_v1_CompilationStagesResponse__Output>): grpc.ClientUnaryCall;
  GetCompilationStages(argument: _compiler_v1_CompilationStagesRequest, callback: grpc.requestCallback<_compiler_v1_CompilationStagesResponse__Output>): grpc.ClientUnaryCall;
  getCompilationStages(argument: _compiler_v1_CompilationStagesRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_compiler_v1_CompilationStagesResponse__Output>): grpc.ClientUnaryCall;
  getCompilationStages(argument: _compiler_v1_CompilationStagesRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_compiler_v1_CompilationStagesResponse__Output>): grpc.ClientUnaryCall;
  getCompilationStages(argument: _compiler_v1_CompilationStagesRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_compiler_v1_CompilationStagesResponse__Output>): grpc.ClientUnaryCall;
  getCompilationStages(argument: _compiler_v1_CompilationStagesRequest, callback: grpc.requestCallback<_compiler_v1_CompilationStagesResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface CompilerServiceHandlers extends grpc.UntypedServiceImplementation {
  Analyze: grpc.handleUnaryCall<_compiler_v1_AnalyzeRequest__Output, _compiler_v1_AnalyzeResponse>;
  
  Compile: grpc.handleUnaryCall<_compiler_v1_CompileRequest__Output, _compiler_v1_CompileResponse>;
  
  GetCompilationStages: grpc.handleUnaryCall<_compiler_v1_CompilationStagesRequest__Output, _compiler_v1_CompilationStagesResponse>;
  
}

export interface CompilerServiceDefinition extends grpc.ServiceDefinition {
  Analyze: MethodDefinition<_compiler_v1_AnalyzeRequest, _compiler_v1_AnalyzeResponse, _compiler_v1_AnalyzeRequest__Output, _compiler_v1_AnalyzeResponse__Output>
  Compile: MethodDefinition<_compiler_v1_CompileRequest, _compiler_v1_CompileResponse, _compiler_v1_CompileRequest__Output, _compiler_v1_CompileResponse__Output>
  GetCompilationStages: MethodDefinition<_compiler_v1_CompilationStagesRequest, _compiler_v1_CompilationStagesResponse, _compiler_v1_CompilationStagesRequest__Output, _compiler_v1_CompilationStagesResponse__Output>
}
