import { ObjectBase, ObjProps } from '../object-base';
import { SERIALIZER } from 'objio';
import {
  TableDataArgs,
  LoadTableGuidResult,
  TableGuid,
  LoadTableDataArgs,
  LoadTableGuidArgs
} from './database-holder-decl';
import {
  LoadTableDataResult,
  PushDataArgs,
  PushDataResult,
  ColumnInfo
} from './database-decl';
import { DatabaseHolderBase } from './database-holder';
import { IDArgs } from '../../common/interfaces';
import {
  SetTableNameArgs
} from './database-table-decl';
import { ApprMapBase, ApprMapClientBase } from '../appr-map';
import { makeTableAppr, TableAppr } from './database-table-appr';

export {
  TableDataArgs,
  LoadTableDataResult as TableData,
  DatabaseHolderBase,
  ObjectBase,
  ObjProps
};

export abstract class DatabaseTableBase extends ObjectBase {
  protected db: DatabaseHolderBase;
  protected tableName: string;
  protected appr: ApprMapBase<TableAppr>;
  protected columns = Array<ColumnInfo>();
  protected tableVersion: string;

  abstract loadTableGuid(args: LoadTableGuidArgs): Promise<LoadTableGuidResult>;
  abstract loadTableRowsNum(args: TableGuid): Promise<number>;
  abstract loadTableData(args: LoadTableDataArgs): Promise<LoadTableDataResult>;

  abstract pushData(args: PushDataArgs): Promise<PushDataResult>;

  abstract setDatabase(args: IDArgs): Promise<void>;
  abstract setTableName(args: SetTableNameArgs): Promise<void>;

  getTableName(): string {
    return this.tableName;
  }

  getDatabase(): DatabaseHolderBase {
    return this.db;
  }

  getIcon() {
    return 'table-icon';
  }

  static TYPE_ID = 'DATABASE-TABLE';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    db:           { type: 'object', const: true },
    tableName:    { type: 'string', const: true },
    appr:         { type: 'object', const: true },
    columns:      { type: 'json', const: true },
    tableVersion: { type: 'string', const: true }
  })
}

export class DatabaseTableClientBase extends DatabaseTableBase {
  constructor() {
    super();

    this.appr = new ApprMapClientBase(makeTableAppr());
  }

  pushData(args: PushDataArgs): Promise<PushDataResult> {
    return this.holder.invokeMethod({ method: 'pushData', args });
  }

  loadTableGuid(args: LoadTableGuidArgs): Promise<LoadTableGuidResult> {
    return this.holder.invokeMethod<LoadTableGuidResult>({ method: 'loadTableGuid', args });
  }

  loadTableRowsNum(args: TableGuid): Promise<number> {
    return this.holder.invokeMethod<number>({ method: 'loadTableRowsNum', args });
  }

  loadTableData(args: LoadTableDataArgs): Promise<LoadTableDataResult> {
    return this.holder.invokeMethod<LoadTableDataResult>({ method: 'loadTableData', args });
  }

  setDatabase(args: IDArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'setDatabase', args });
  }

  setTableName(args: SetTableNameArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'setTableName', args });
  }
}
