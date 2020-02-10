import { SERIALIZER } from 'objio';
import { DataSourceBase } from './data-source';
import { ObjectBase, IconType, ObjProps } from '../object-base';

export interface TableDescArgs {
  guid?: string;
}

export interface TableDescResult {
  cols: Array<string>;
  rows: number;
}

export interface TableRowsArgs {
  guid?: string;

  startRow: number;
  rowsCount: number;
}

export interface TableRowsResult {
  startRow: number;
  rows: Array< Array<string | number> >;
}

export abstract class DataSourceHolderBase extends ObjectBase {
  protected dataSource: DataSourceBase;

  getIcon(type: IconType) {
    return this.dataSource.getIcon(type);
  }

  getStatus() {
    return this.dataSource.getStatus();
  }

  getProgress() {
    return this.dataSource.getProgress();
  }

  isStatusInProgess() {
    return this.dataSource.isStatusInProgess();
  }

  renderSelObjProps(props: ObjProps) {
    return this.dataSource.renderSelObjProps(props);
  }

  abstract getTableDesc(args: TableDescArgs): Promise<TableDescResult>;
  abstract getTableRows(args: TableRowsArgs): Promise<TableRowsResult>;

  static TYPE_ID = 'DataSourceHolder';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    dataSource: { type: 'object', const: true }
  })
}

export interface DataSourceHolderArgs {
  dataSource: DataSourceBase;
}

export class DataSourceHolderClientBase extends DataSourceHolderBase {
  constructor(args?: DataSourceHolderArgs) {
    super();

    if (args) {
      this.dataSource = args.dataSource;
    }
  }

  getFS() {
    if (!this.dataSource)
      return null;

    return this.dataSource.getFS();
  }

  getTableDesc(args: TableDescArgs): Promise<TableDescResult> {
    return this.holder.invokeMethod({ method: 'getTableDesc', args });
  }

  getTableRows(args: TableRowsArgs): Promise<TableRowsResult> {
    return this.holder.invokeMethod({ method: 'getTableRows', args });
  }
}
