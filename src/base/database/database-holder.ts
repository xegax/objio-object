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
  LoadAggrDataResult,
  ImportTableArgs
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
  abstract setConnection(conn: IDArgs): Promise<boolean>;
  abstract setDatabase(db: string): Promise<boolean>;
  abstract createDatabase(db: string): Promise<void>;
  abstract deleteDatabase(db: string): Promise<void>;

  abstract loadTableList(): Promise<Array<TableDesc>>;
  abstract loadTableGuid(args: LoadTableGuidArgs): Promise<LoadTableGuidResult>;

  abstract loadTableRowsNum(args: TableGuid): Promise<number>;
  abstract loadTableData(args: LoadTableDataArgs): Promise<LoadTableDataResult>;
  abstract loadAggrData(args: LoadAggrDataArgs): Promise<LoadAggrDataResult>;

  abstract loadDatabaseList(): Promise<Array<string>>;

  abstract importTable(arsg: ImportTableArgs): Promise<void>;
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

  getConnection(): ConnectionBase {
    return this.getRemote().getConnection();
  }

  getDatabase(): string {
    return this.getRemote().getDatabase();
  }

  getConnClasses() {
    return this.getRemote().getConnClasses();
  }

  static TYPE_ID = 'DatabaseHolder';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    impl: { type: 'object', const: true }
  })
}

export class DatabaseHolderClientBase extends DatabaseHolderBase {
  setConnection(conn: IDArgs): Promise<boolean> {
    return this.holder.invokeMethod({ method: 'setConnection', args: conn });
  }

  setDatabase(database: string): Promise<boolean> {
    return this.holder.invokeMethod({ method: 'setDatabase', args: { database }});
  }

  createDatabase(database: string): Promise<void> {
    return this.holder.invokeMethod({ method: 'createDatabase', args: { database } });
  }

  deleteDatabase(database: string): Promise<void> {
    const remote = this.getRemote();
    if (remote.getDatabase() == database)
      remote.setDatabase('');

    return this.holder.invokeMethod({ method: 'deleteDatabase', args: { database }});
  }

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

  importTable(args: ImportTableArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'importTable', args });
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...DatabaseHolderBase.SERIALIZE()
  })
}
