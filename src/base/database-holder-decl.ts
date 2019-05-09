import { StrMap } from '../common/interfaces';

export type AggregationFunc = 'min' | 'max' | 'sum' | 'count' | 'avg';

export interface ValueCond {
  column: string;
  value: string | Array<string | number> | CompoundCond;
  like?: boolean;
  inverse?: boolean;
}

export interface CompoundCond {
  values: Array<ValueCond | CompoundCond>;
  op: 'or' | 'and';
  table?: string;
}

export interface TableDescShort {
  columns: Array<ColumnInfo>;
  rowsNum: number;
}

export interface TableDesc extends TableDescShort {
  tableName: string;
}

export interface LoadTableGuidArgs {
  tableName: string;
  cond?: CompoundCond;
  desc?: boolean;   // include table description to result
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

export interface LoadTableDataResult {
  rows: Array<StrMap>;
  fromRow: number;
  rowsNum: number;
}

export interface TableDataArgs {
  guid: string;
  fromRow: number;
  rowsNum: number;
}

export interface ColumnInfo {
  colName: string;
  colType: string;
}

export interface ColumnToCreate extends ColumnInfo {
  notNull?: boolean;
  unique?: boolean;
  primary?: boolean;
  autoInc?: boolean;
  index?: boolean;
}

export interface PushDataArgs {
  tableName: string;
  rows: Array<StrMap>;
  updateVersion?: boolean;
}

export interface PushDataResult {
  pushRows: number;
}

export interface DeleteDataArgs {
  tableName: string;
  cond: CompoundCond;
}

export interface UpdateValue {
  column: string;
  value: string;
}

export interface UpdateDataArgs {
  tableName: string;
  values: Array<UpdateValue>;
  cond?: CompoundCond;
  limit?: number;
}

export interface CreateTableArgs {
  tableName: string;
  columns: Array<ColumnToCreate>;
}

export interface DeleteTableArgs {
  tableName: string;
}

export interface LoadAggrDataArgs {
  guid: string;
  values: Array<{ column: string; aggs: AggregationFunc }>;
}

export interface LoadAggrDataResult {
  values: Array<{ column: string; aggs: AggregationFunc; value: number }>;
}
