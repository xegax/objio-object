import { SERIALIZER } from 'objio';
import { ObjectBase, ObjProps } from '../object-base';
import { DataSourceCol as Col } from './data-source-profile';

export interface ColumnStat {
  name: string;
  empty: number;          // size == 0
  count: number;
  strMinMax: number[];    // > 0
  strCount: number;
  intCount: number;     
  doubleCount: number;  
  numMinMax: number[];
}

export interface TableDescArgs {
}

export interface TableDescResult {
  cols: Array<string>;
  rows: number;
}

export interface TableRowsArgs {
  startRow: number;
  rowsCount: number;
}

export interface TableRowsResult {
  startRow: number;
  rows: Array< Array<string | number> >;  // [ [c1,c2,c3], [c1,c2,c3], ...]
}

export interface DataSourceCol {
  name: string;
}

export interface ExecuteArgs {
  columns: {[name: string]: Col};
  genericCols: Array<string>;
}

export abstract class DataSourceBase extends ObjectBase {
  protected totalRows: number = 0;
  protected totalCols = Array<DataSourceCol>();
  protected colsStat = new Map<string, ColumnStat>();

  abstract getTableDesc(args: TableDescArgs): Promise<TableDescResult>;
  abstract getTableRows(args: TableRowsArgs): Promise<TableRowsResult>;
  abstract execute(args: ExecuteArgs): Promise<void>;

  getTotalRows() {
    return this.totalRows;
  }

  getTotalCols() {
    return this.totalCols;
  }

  getColsStat() {
    return this.colsStat;
  }

  renderTabs(props: ObjProps): Array<JSX.Element> {
    return [];
  }

  static TYPE_ID = 'DataSource';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    totalRows: { type: 'integer', const: true },
    totalCols: { type: 'json', cons: true }
  })
}
