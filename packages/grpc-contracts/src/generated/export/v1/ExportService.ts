// Original file: proto/export/v1/export.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { ExportRequest as _export_v1_ExportRequest, ExportRequest__Output as _export_v1_ExportRequest__Output } from '../../export/v1/ExportRequest.js';
import type { ExportResponse as _export_v1_ExportResponse, ExportResponse__Output as _export_v1_ExportResponse__Output } from '../../export/v1/ExportResponse.js';
import type { GetSupportedFormatsRequest as _export_v1_GetSupportedFormatsRequest, GetSupportedFormatsRequest__Output as _export_v1_GetSupportedFormatsRequest__Output } from '../../export/v1/GetSupportedFormatsRequest.js';
import type { GetSupportedFormatsResponse as _export_v1_GetSupportedFormatsResponse, GetSupportedFormatsResponse__Output as _export_v1_GetSupportedFormatsResponse__Output } from '../../export/v1/GetSupportedFormatsResponse.js';

export interface ExportServiceClient extends grpc.Client {
  Export(argument: _export_v1_ExportRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_export_v1_ExportResponse__Output>): grpc.ClientUnaryCall;
  Export(argument: _export_v1_ExportRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_export_v1_ExportResponse__Output>): grpc.ClientUnaryCall;
  Export(argument: _export_v1_ExportRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_export_v1_ExportResponse__Output>): grpc.ClientUnaryCall;
  Export(argument: _export_v1_ExportRequest, callback: grpc.requestCallback<_export_v1_ExportResponse__Output>): grpc.ClientUnaryCall;
  export(argument: _export_v1_ExportRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_export_v1_ExportResponse__Output>): grpc.ClientUnaryCall;
  export(argument: _export_v1_ExportRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_export_v1_ExportResponse__Output>): grpc.ClientUnaryCall;
  export(argument: _export_v1_ExportRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_export_v1_ExportResponse__Output>): grpc.ClientUnaryCall;
  export(argument: _export_v1_ExportRequest, callback: grpc.requestCallback<_export_v1_ExportResponse__Output>): grpc.ClientUnaryCall;
  
  GetSupportedFormats(argument: _export_v1_GetSupportedFormatsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_export_v1_GetSupportedFormatsResponse__Output>): grpc.ClientUnaryCall;
  GetSupportedFormats(argument: _export_v1_GetSupportedFormatsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_export_v1_GetSupportedFormatsResponse__Output>): grpc.ClientUnaryCall;
  GetSupportedFormats(argument: _export_v1_GetSupportedFormatsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_export_v1_GetSupportedFormatsResponse__Output>): grpc.ClientUnaryCall;
  GetSupportedFormats(argument: _export_v1_GetSupportedFormatsRequest, callback: grpc.requestCallback<_export_v1_GetSupportedFormatsResponse__Output>): grpc.ClientUnaryCall;
  getSupportedFormats(argument: _export_v1_GetSupportedFormatsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_export_v1_GetSupportedFormatsResponse__Output>): grpc.ClientUnaryCall;
  getSupportedFormats(argument: _export_v1_GetSupportedFormatsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_export_v1_GetSupportedFormatsResponse__Output>): grpc.ClientUnaryCall;
  getSupportedFormats(argument: _export_v1_GetSupportedFormatsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_export_v1_GetSupportedFormatsResponse__Output>): grpc.ClientUnaryCall;
  getSupportedFormats(argument: _export_v1_GetSupportedFormatsRequest, callback: grpc.requestCallback<_export_v1_GetSupportedFormatsResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface ExportServiceHandlers extends grpc.UntypedServiceImplementation {
  Export: grpc.handleUnaryCall<_export_v1_ExportRequest__Output, _export_v1_ExportResponse>;
  
  GetSupportedFormats: grpc.handleUnaryCall<_export_v1_GetSupportedFormatsRequest__Output, _export_v1_GetSupportedFormatsResponse>;
  
}

export interface ExportServiceDefinition extends grpc.ServiceDefinition {
  Export: MethodDefinition<_export_v1_ExportRequest, _export_v1_ExportResponse, _export_v1_ExportRequest__Output, _export_v1_ExportResponse__Output>
  GetSupportedFormats: MethodDefinition<_export_v1_GetSupportedFormatsRequest, _export_v1_GetSupportedFormatsResponse, _export_v1_GetSupportedFormatsRequest__Output, _export_v1_GetSupportedFormatsResponse__Output>
}
