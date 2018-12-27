import { ColumnAttr } from '../../base/table';

export interface OnRowsArgs {
  rows: ReadRowsResult;
  progress: number;
}

export interface ReadLinesArgs {
  linesPerBunch: number;
  onRows?(args: OnRowsArgs): Promise<any>;
}

export type ReadRowsResult = Array<{[key: string]: string}>;

export interface DataReading {
  readRows(args: ReadLinesArgs): Promise<any>;
}
