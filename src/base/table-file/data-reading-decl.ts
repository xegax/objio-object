import { ColumnAttr } from './table-file-decl';

export interface OnRowsArgs {
  rows: ReadRowsResult;
  progress: number;
}

export interface ReadLinesArgs {
  linesPerBunch: number;
  onRows?(args: OnRowsArgs): Promise<any>;
}

export type ReadRowsResult = Array<{[key: string]: string | number}>;

export interface DataReader {
  readRows(args: ReadLinesArgs): Promise<any>;
  readCols(): Promise<Array<ColumnAttr>>;
}
