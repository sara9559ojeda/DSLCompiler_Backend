import type * as grpc from '@grpc/grpc-js';
import type { EnumTypeDefinition, MessageTypeDefinition } from '@grpc/proto-loader';

import type { AnalyzeRequest as _compiler_v1_AnalyzeRequest, AnalyzeRequest__Output as _compiler_v1_AnalyzeRequest__Output } from './compiler/v1/AnalyzeRequest.js';
import type { AnalyzeResponse as _compiler_v1_AnalyzeResponse, AnalyzeResponse__Output as _compiler_v1_AnalyzeResponse__Output } from './compiler/v1/AnalyzeResponse.js';
import type { CompilationStagesRequest as _compiler_v1_CompilationStagesRequest, CompilationStagesRequest__Output as _compiler_v1_CompilationStagesRequest__Output } from './compiler/v1/CompilationStagesRequest.js';
import type { CompilationStagesResponse as _compiler_v1_CompilationStagesResponse, CompilationStagesResponse__Output as _compiler_v1_CompilationStagesResponse__Output } from './compiler/v1/CompilationStagesResponse.js';
import type { CompileRequest as _compiler_v1_CompileRequest, CompileRequest__Output as _compiler_v1_CompileRequest__Output } from './compiler/v1/CompileRequest.js';
import type { CompileResponse as _compiler_v1_CompileResponse, CompileResponse__Output as _compiler_v1_CompileResponse__Output } from './compiler/v1/CompileResponse.js';
import type { CompilerServiceClient as _compiler_v1_CompilerServiceClient, CompilerServiceDefinition as _compiler_v1_CompilerServiceDefinition } from './compiler/v1/CompilerService.js';
import type { Diagnostic as _compiler_v1_Diagnostic, Diagnostic__Output as _compiler_v1_Diagnostic__Output } from './compiler/v1/Diagnostic.js';
import type { SourcePosition as _compiler_v1_SourcePosition, SourcePosition__Output as _compiler_v1_SourcePosition__Output } from './compiler/v1/SourcePosition.js';
import type { StageTiming as _compiler_v1_StageTiming, StageTiming__Output as _compiler_v1_StageTiming__Output } from './compiler/v1/StageTiming.js';
import type { Token as _compiler_v1_Token, Token__Output as _compiler_v1_Token__Output } from './compiler/v1/Token.js';
import type { ExportRequest as _export_v1_ExportRequest, ExportRequest__Output as _export_v1_ExportRequest__Output } from './export/v1/ExportRequest.js';
import type { ExportResponse as _export_v1_ExportResponse, ExportResponse__Output as _export_v1_ExportResponse__Output } from './export/v1/ExportResponse.js';
import type { ExportServiceClient as _export_v1_ExportServiceClient, ExportServiceDefinition as _export_v1_ExportServiceDefinition } from './export/v1/ExportService.js';
import type { GetSupportedFormatsRequest as _export_v1_GetSupportedFormatsRequest, GetSupportedFormatsRequest__Output as _export_v1_GetSupportedFormatsRequest__Output } from './export/v1/GetSupportedFormatsRequest.js';
import type { GetSupportedFormatsResponse as _export_v1_GetSupportedFormatsResponse, GetSupportedFormatsResponse__Output as _export_v1_GetSupportedFormatsResponse__Output } from './export/v1/GetSupportedFormatsResponse.js';
import type { SupportedFormat as _export_v1_SupportedFormat, SupportedFormat__Output as _export_v1_SupportedFormat__Output } from './export/v1/SupportedFormat.js';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  compiler: {
    v1: {
      AnalyzeRequest: MessageTypeDefinition<_compiler_v1_AnalyzeRequest, _compiler_v1_AnalyzeRequest__Output>
      AnalyzeResponse: MessageTypeDefinition<_compiler_v1_AnalyzeResponse, _compiler_v1_AnalyzeResponse__Output>
      CompilationStagesRequest: MessageTypeDefinition<_compiler_v1_CompilationStagesRequest, _compiler_v1_CompilationStagesRequest__Output>
      CompilationStagesResponse: MessageTypeDefinition<_compiler_v1_CompilationStagesResponse, _compiler_v1_CompilationStagesResponse__Output>
      CompileRequest: MessageTypeDefinition<_compiler_v1_CompileRequest, _compiler_v1_CompileRequest__Output>
      CompileResponse: MessageTypeDefinition<_compiler_v1_CompileResponse, _compiler_v1_CompileResponse__Output>
      CompilerService: SubtypeConstructor<typeof grpc.Client, _compiler_v1_CompilerServiceClient> & { service: _compiler_v1_CompilerServiceDefinition }
      Diagnostic: MessageTypeDefinition<_compiler_v1_Diagnostic, _compiler_v1_Diagnostic__Output>
      Severity: EnumTypeDefinition
      SourcePosition: MessageTypeDefinition<_compiler_v1_SourcePosition, _compiler_v1_SourcePosition__Output>
      StageTiming: MessageTypeDefinition<_compiler_v1_StageTiming, _compiler_v1_StageTiming__Output>
      Token: MessageTypeDefinition<_compiler_v1_Token, _compiler_v1_Token__Output>
    }
  }
  export: {
    v1: {
      ExportFormat: EnumTypeDefinition
      ExportRequest: MessageTypeDefinition<_export_v1_ExportRequest, _export_v1_ExportRequest__Output>
      ExportResponse: MessageTypeDefinition<_export_v1_ExportResponse, _export_v1_ExportResponse__Output>
      ExportService: SubtypeConstructor<typeof grpc.Client, _export_v1_ExportServiceClient> & { service: _export_v1_ExportServiceDefinition }
      GetSupportedFormatsRequest: MessageTypeDefinition<_export_v1_GetSupportedFormatsRequest, _export_v1_GetSupportedFormatsRequest__Output>
      GetSupportedFormatsResponse: MessageTypeDefinition<_export_v1_GetSupportedFormatsResponse, _export_v1_GetSupportedFormatsResponse__Output>
      SupportedFormat: MessageTypeDefinition<_export_v1_SupportedFormat, _export_v1_SupportedFormat__Output>
    }
  }
}

