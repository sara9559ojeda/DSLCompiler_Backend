// Original file: proto/compiler/v1/compiler.proto


export interface PassReport {
  'pass'?: (string);
  'removedShapes'?: (number);
  'removedConnections'?: (number);
}

export interface PassReport__Output {
  'pass': (string);
  'removedShapes': (number);
  'removedConnections': (number);
}
