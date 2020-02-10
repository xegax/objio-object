import {
  DataSourceBase,
  TableDescArgs,
  TableDescResult,
  TableRowsArgs,
  TableRowsResult
} from './data-source';
import { SERIALIZER, FileSystemSimple } from 'objio';

export abstract class JSONDataSourceBase extends DataSourceBase {
  constructor(args?) {
    super(args);

    this.fs = new FileSystemSimple();
  }

  getIcon() {
    return 'json-icon';
  }

  static TYPE_ID = 'JSONDataSource';
  static SERIALIZE: SERIALIZER = () => ({
    ...DataSourceBase.SERIALIZE()
  })
}

export class JSONDataSourceClientBase extends JSONDataSourceBase {
  getTableDesc(args: TableDescArgs): Promise<TableDescResult> {
    return this.holder.invokeMethod({ method: 'getTableDesc', args });
  }

  getTableRows(args: TableRowsArgs): Promise<TableRowsResult> {
    return this.holder.invokeMethod({ method: 'getTableRows', args });
  }
}
