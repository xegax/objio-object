import {
  TableDescArgs,
  TableDescResult,
  TableRowsArgs,
  TableRowsResult,
  ExecuteArgs
} from '../../base/datasource/data-source';
import { NumericDataSourceBase } from '../../base/datasource/numeric-source';

export class NumericDataSource extends NumericDataSourceBase {
  constructor(args?) {
    super(args);

    this.holder.setMethodsToInvoke({
      getTableDesc: {
        method: (args: TableDescArgs) => this.getTableDesc(args),
        rights: 'read'
      },
      getTableRows: {
        method: (args: TableRowsArgs) => this.getTableRows(args),
        rights: 'read'
      },
      setRowsNum: {
        method: (args: { rowsNum: number }) => this.setRowsNum(args.rowsNum),
        rights: 'write'
      },
      execute: {
        method: (args: ExecuteArgs, userId: string) => this.execute({...args, userId}),
        rights: 'write'
      }
    });
  }

  getTableDesc(args: TableDescArgs): Promise<TableDescResult> {
    return Promise.resolve({
      cols: ['index'],
      rows: this.rows
    });
  }

  getTableRows(args: TableRowsArgs): Promise<TableRowsResult> {
    const startRow = Math.max(Math.min(args.startRow, this.rows - 1), 0);
    const rowsCount = Math.min(startRow + args.rowsCount, this.rows) - startRow;

    return Promise.resolve({
      startRow,
      rows: Array(rowsCount).fill(null).map((_, i) => {
        return [ startRow + i ];
      })
    });
  }

  execute(args: ExecuteArgs & { userId: string }) {
    return Promise.resolve();
  }

  setRowsNum(num: number) {
    if (this.rows == num)
      return Promise.resolve();

    this.rows = num;
    this.holder.save();
  }
}
