import {
  CompoundCond,
  AggregationFunc,
  TableDesc,
  TableDescShort,
  ColOrder
} from './database-decl';

export interface LoadTableGuidArgs {
  table: string;
  distinct?: string;
  cond?: CompoundCond;
  columns?: Array<string>;
  order?: Array<ColOrder>;
  desc?: boolean;   // include table description to result
}

export interface ImportTableArgs {
  tableFileId: string;
  tableName: string;
}

export interface LoadTableGuidResult {
  guid: string;
  desc?: TableDescShort;
}

export interface TableGuid {
  guid: string;
}

export interface LoadTableDataArgs {
  guid: string;
  from: number;
  count: number;
}

export interface TableDataArgs {
  guid: string;
  fromRow: number;
  rowsNum: number;
}

export interface LoadAggrDataArgs {
  guid: string;
  values: Array<{ column: string; aggs: AggregationFunc }>;
}

export interface LoadAggrDataResult {
  values: Array<{ column: string; aggs: AggregationFunc; value: number }>;
}

export interface GuidMapData {
  args: LoadTableGuidArgs;
  desc: TableDesc;
  tmpTable: string;
  invalid: boolean;
  createTask: Promise<TableDescShort>;
}
