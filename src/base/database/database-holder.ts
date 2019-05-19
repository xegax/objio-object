import { SERIALIZER, OBJIOItemClass } from 'objio';
import { ObjectBase } from '../object-base';
import { IDArgs } from '../../common/interfaces';
import { ConnectionBase } from './connection';
import {
  TableGuid,
  TableDesc,
  LoadTableGuidResult,
  LoadTableGuidArgs,
  LoadTableDataArgs,
  LoadTableDataResult,
  CreateTableArgs,
  DeleteDataArgs,
  DeleteTableArgs,
  PushDataArgs,
  PushDataResult,
  LoadAggrDataArgs,
  LoadAggrDataResult,
  UpdateDataArgs
} from './database-holder-decl';

export abstract class DatabaseBase2 extends ObjectBase {
  protected conn: ConnectionBase;
  protected database: string;
  // conn and database are using by remote database

  abstract loadTableList(): Promise<Array<TableDesc>>;
  abstract loadTableGuid(args: LoadTableGuidArgs): Promise<LoadTableGuidResult>;
  abstract loadAggrData(args: LoadAggrDataArgs): Promise<LoadAggrDataResult>;

  abstract loadTableRowsNum(args: TableGuid): Promise<number>;
  abstract loadTableData(args: LoadTableDataArgs): Promise<LoadTableDataResult>;

  abstract createTable(args: CreateTableArgs): Promise<TableDesc>;
  abstract deleteTable(args: DeleteTableArgs): Promise<void>;
  abstract pushData(args: PushDataArgs): Promise<PushDataResult>;
  abstract updateData(args: UpdateDataArgs): Promise<void>;
  abstract deleteData(args: DeleteDataArgs): Promise<void>;
  
  // remote db
  abstract isRemote(): boolean;
  abstract setConnection(args: IDArgs): Promise<void>;
  abstract setDatabase(name: string): Promise<void>;
  abstract getDatabaseList(): Promise<Array<string>>;
  abstract getConnClasses(): Array<OBJIOItemClass>;

  getConnection(): ConnectionBase {
    return this.conn;
  }

  getDatabase() {
    return this.database;
  }

  static TYPE_ID = 'Database2'; // It must be overridden in implementation
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    conn:     { type: 'object', const: true },
    database: { type: 'string', const: true }
  })
}

export interface DatabaseHolderArgs {
  impl: DatabaseBase2;
}

export abstract class DatabaseHolderBase extends DatabaseBase2 {
  protected impl: DatabaseBase2 = null;

  constructor(args?: DatabaseHolderArgs) {
    super();

    if (args) {
      this.impl = args.impl;
    }
  }

  loadTableList(): Promise<Array<TableDesc>> {
    return this.impl.loadTableList();
  }

  loadTableGuid(args: LoadTableGuidArgs): Promise<LoadTableGuidResult> {
    return this.impl.loadTableGuid(args);
  }

  loadTableRowsNum(args: TableGuid): Promise<number> {
    return this.impl.loadTableRowsNum(args);
  }

  loadTableData(args: LoadTableDataArgs): Promise<LoadTableDataResult> {
    return this.impl.loadTableData(args);
  }

  loadAggrData(args: LoadAggrDataArgs): Promise<LoadAggrDataResult> {
    return this.impl.loadAggrData(args);
  }

  getDatabaseList(): Promise<Array<string>> {
    return this.impl.getDatabaseList();
  }

  isRemote() {
    return this.impl.isRemote();
  }

  getConnClasses(): Array<OBJIOItemClass> {
    return this.impl.getConnClasses();
  }

  getConnection(): ConnectionBase {
    return this.impl.getConnection();
  }

  getDatabase() {
    return this.impl.getDatabase();
  }

  static TYPE_ID = 'DatabaseHolder';
  static SERIALIZE: SERIALIZER = () => ({
    ...DatabaseBase2.SERIALIZE(),
    impl: { type: 'object', const: true }
  })
}
