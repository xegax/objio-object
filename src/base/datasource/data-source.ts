import { SERIALIZER, OBJIOItem } from 'objio';
import { ObjectBase } from '../object-base';

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

export abstract class DataSourceBase extends ObjectBase {
  protected totalRows: number = 0;
  protected totalCols = Array<DataSourceCol>();

  abstract getTableDesc(args: TableDescArgs): Promise<TableDescResult>;
  abstract getTableRows(args: TableRowsArgs): Promise<TableRowsResult>;

  getTotalRows() {
    return this.totalRows;
  }

  getTotalCols() {
    return this.totalCols;
  }

  static TYPE_ID = 'DataSource';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    totalRows: { type: 'integer', const: true },
    totalCols: { type: 'json', cons: true }
  })
}
