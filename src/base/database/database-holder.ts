import { SERIALIZER, OBJIOItemClass } from 'objio';
import { ObjectBase } from '../object-base';
import { IDArgs } from '../../common/interfaces';
import { ConnectionBase } from './connection';
import {
  TableDesc,
  LoadTableDataResult,
  CreateTableArgs,
  DeleteDataArgs,
  DeleteTableArgs,
  PushDataArgs,
  PushDataResult,
  UpdateDataArgs
} from './database-decl';
import {
  TableGuid,
  LoadTableGuidResult,
  LoadTableGuidArgs,
  LoadTableDataArgs,
  LoadAggrDataArgs,
  LoadAggrDataResult
} from './database-holder-decl';
import { DatabaseBase, RemoteDatabaseBase } from './database';

export interface DatabaseHolderArgs {
  impl: DatabaseBase;
}

export abstract class DatabaseHolderBase extends ObjectBase {
  protected impl: DatabaseBase;

  constructor(args?: DatabaseHolderArgs) {
    super();

    if (args)
      this.impl = args.impl;
  }

  abstract loadTableList(): Promise<Array<TableDesc>>;
  abstract loadTableGuid(args: LoadTableGuidArgs): Promise<LoadTableGuidResult>;

  abstract loadTableRowsNum(args: TableGuid): Promise<number>;
  abstract loadTableData(args: LoadTableDataArgs): Promise<LoadTableDataResult>;
  abstract loadAggrData(args: LoadAggrDataArgs): Promise<LoadAggrDataResult>;

  abstract loadDatabaseList(): Promise<Array<string>>;

  abstract createTable(args: CreateTableArgs): Promise<TableDesc>;
  abstract deleteTable(args: DeleteTableArgs): Promise<void>;
  abstract pushData(args: PushDataArgs): Promise<PushDataResult>;
  abstract updateData(args: UpdateDataArgs): Promise<void>;
  abstract deleteData(args: DeleteDataArgs): Promise<void>;

  isRemote(): boolean {
    return this.impl instanceof RemoteDatabaseBase;
  }

  protected getRemote() {
    if (this.impl instanceof RemoteDatabaseBase)
      return this.impl;

    throw `it is not a remote database`;
  }

  setConnection(conn: IDArgs): Promise<void> {
    return this.getRemote().setConnection(conn);
  }

  getConnection(): ConnectionBase {
    return this.getRemote().getConnection();
  }

  getDatabase(): string {
    return this.getRemote().getDatabase();
  }

  setDatabase(db: string) {
    return this.getRemote().setDatabase(db);
  }

  getConnClasses() {
    return this.getRemote().getConnClasses();
  }

  deleteDatabase(db: string) {
    return this.getRemote().deleteDatabase(db);
  }

  static TYPE_ID = 'DatabaseHolder';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    impl: { type: 'object', const: true }
  })
}

export class DatabaseHolderClientBase extends DatabaseHolderBase {
  loadTableList(): Promise<Array<TableDesc>> {
    return this.holder.invokeMethod({ method: 'loadTableList', args: {} });
  }

  loadTableRowsNum(args: TableGuid): Promise<number> {
    return this.holder.invokeMethod({ method: 'loadTableRowsNum', args });
  }

  loadTableGuid(args: LoadTableGuidArgs): Promise<LoadTableGuidResult> {
    return this.holder.invokeMethod({ method: 'loadTableGuid', args });
  }

  loadTableData(args: LoadTableDataArgs): Promise<LoadTableDataResult> {
    return this.holder.invokeMethod({ method: 'loadTableData', args });
  }

  loadAggrData(args: LoadAggrDataArgs): Promise<LoadAggrDataResult> {
    return this.holder.invokeMethod({ method: 'loadAggrData', args });
  }

  loadDatabaseList(): Promise<Array<string>> {
    return this.holder.invokeMethod({ method: 'loadDatabaseList', args: {} });
  }

  createTable(args: CreateTableArgs): Promise<TableDesc> {
    return this.holder.invokeMethod({ method: 'createTable', args });
  }

  deleteTable(args: DeleteTableArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'deleteTable', args });
  }

  pushData(args: PushDataArgs): Promise<PushDataResult> {
    return this.holder.invokeMethod({ method: 'pushData', args });
  }

  updateData(args: UpdateDataArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'updateData', args });
  }

  deleteData(args: DeleteDataArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'deleteData', args });
  }

  setConnection(args: IDArgs): Promise<void> {
    return (
      super.setConnection(args)
      .then(() => this.holder.invokeMethod({ method: 'setConnection', args }))
    );
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...DatabaseHolderBase.SERIALIZE()
  })
}
