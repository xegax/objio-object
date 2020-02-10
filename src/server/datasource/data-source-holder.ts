import {
  DataSourceHolderBase,
  TableDescArgs,
  TableRowsArgs,
  TableDescResult,
  TableRowsResult
} from '../../base/datasource/data-source-holder';

export class DataSourceHolder extends DataSourceHolderBase {
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
      }
    });
  }

  getTableDesc(args: TableDescArgs): Promise<TableDescResult> {
    if (!args.guid)
      return this.dataSource.getTableDesc(args);

    return Promise.reject('not implemented');
  }

  getTableRows(args: TableRowsArgs): Promise<TableRowsResult> {
    if (!args.guid)
      return this.dataSource.getTableRows(args);

    return Promise.reject('not implemented');
  }
}
