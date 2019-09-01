import { StrMap } from '../../common/interfaces';

export type AggregationFunc = 'min' | 'max' | 'sum' | 'count' | 'avg';

export interface ValueCond {
  column: string;
  value: string | Array<string | number> | CompoundCond;
  like?: boolean;
  inverse?: boolean;
}

export interface RangeCond {
  column: string;
  range: Array<number>;
}

export interface CompoundCond {
  values: Array<ValueCond | CompoundCond | RangeCond>;
  op: 'or' | 'and';
  table?: string;
}

export interface ColOrder {
  column: string;
  reverse?: boolean;
}

export interface TableDescShort {
  columns: Array<ColumnInfo>;
  rowsNum: number;
}

export interface TableDesc extends TableDescShort {
  table: string;
}

export interface LoadTableGuidArgs {
  table: string;
  cond?: CompoundCond;
  desc?: boolean;   // include table description to result
}

export interface LoadTableGuidResult {
  table: string;
  desc?: TableDescShort;
}

export interface TableArgs {
  table: string;
}

export interface LoadTableDataArgs {
  table: string;
  from: number;
  count: number;
}

export interface LoadTableDataResult {
  rows: Array<StrMap>;
  fromRow: number;
  rowsNum: number;
}

export interface ColumnInfo {
  colName: string;
  colType: string;
}

export interface ColumnInfoFull extends ColumnInfo {
  notNull?: boolean;
  unique?: boolean;
  primary?: boolean;
  autoInc?: boolean;
  index?: boolean;
}

export interface PushDataArgs {
  table: string;
  rows: Array<StrMap>;
  updateVersion?: boolean;
}

export interface PushDataResult {
  pushRows: number;
}

export interface DeleteDataArgs {
  table: string;
  cond: CompoundCond;
}

export interface UpdateValue {
  column: string;
  value: string;
}

export interface UpdateDataArgs {
  table: string;
  values: Array<UpdateValue>;
  cond?: CompoundCond;
  limit?: number;
}

export interface CreateTableArgs {
  table: string;
  columns: Array<ColumnInfoFull>;
}

export interface CreateTempTableArgs {
  table: string;
  tmpTableName: string;
  cond?: CompoundCond;
  columns?: Array<string>;
  order?: Array<ColOrder>;
  distinct?: string;
}

export interface DeleteTableArgs {
  table: string;
}

export interface LoadAggrDataArgs {
  table: string;
  values: Array<{ column: string; aggs: AggregationFunc }>;
}

export interface LoadAggrDataResult {
  values: Array<{ column: string; aggs: AggregationFunc; value: number }>;
}
