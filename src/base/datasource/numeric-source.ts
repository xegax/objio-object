import {
  DataSourceBase,
  TableDescArgs,
  TableDescResult,
  TableRowsArgs,
  TableRowsResult
} from './data-source';
import { SERIALIZER } from 'objio';

interface NumericDataSourceArgs {
  rows: number;
}

export abstract class NumericDataSourceBase extends DataSourceBase {
  protected rows: number = 0;

  constructor(args?: NumericDataSourceArgs) {
    super();

    if (args)
      this.rows = args.rows;
  }

  abstract setRowsNum(num: number): Promise<void>;

  static TYPE_ID = 'NumericDataSource';
  static SERIALIZE: SERIALIZER = () => ({
    ...DataSourceBase.SERIALIZE(),
    rows: { type: 'integer', const: true }
  });
}

export class NumericDataSourceClientBase extends NumericDataSourceBase {
  getTableDesc(args: TableDescArgs): Promise<TableDescResult> {
    return this.holder.invokeMethod({ method: 'getTableDesc', args });
  }

  getTableRows(args: TableRowsArgs): Promise<TableRowsResult> {
    return this.holder.invokeMethod({ method: 'getTableRows', args });
  }

  setRowsNum(rowsNum: number): Promise<void> {
    return this.holder.invokeMethod({ method: 'setRowsNum', args: { rowsNum }});
  }
}
