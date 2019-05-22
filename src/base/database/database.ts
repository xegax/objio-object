import { SERIALIZER, OBJIOItemClass } from 'objio';
import { ObjectBase } from '../object-base';
import {
  LoadAggrDataArgs,
  TableDesc,
  TableDescShort,
  LoadTableDataResult,
  CreateTableArgs,
  DeleteDataArgs,
  DeleteTableArgs,
  PushDataArgs,
  PushDataResult,
  LoadAggrDataResult,
  UpdateDataArgs,
  LoadTableDataArgs,
  CreateTempTableArgs,
  TableArgs
} from './database-decl';
import { ConnectionBase } from './connection';
import { IDArgs } from '../../common/interfaces';

export abstract class DatabaseBase extends ObjectBase {
  abstract loadTableList(): Promise<Array<TableDesc>>;

  abstract loadAggrData(args: LoadAggrDataArgs): Promise<LoadAggrDataResult>;
  abstract loadTableRowsNum(args: TableArgs): Promise<number>;
  abstract loadTableData(args: LoadTableDataArgs): Promise<LoadTableDataResult>;

  abstract createTempTable(args: CreateTempTableArgs): Promise<TableDescShort>;
  abstract createTable(args: CreateTableArgs): Promise<TableDesc>;

  abstract pushData(args: PushDataArgs): Promise<PushDataResult>;
  abstract updateData(args: UpdateDataArgs): Promise<void>;
  abstract deleteData(args: DeleteDataArgs): Promise<void>;
  abstract deleteTable(args: DeleteTableArgs): Promise<void>;

  static TYPE_ID: string = null;
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE()
  })
}

export abstract class RemoteDatabaseBase extends DatabaseBase {
  protected database: string;
  protected conn: ConnectionBase;

  abstract setConnection(args: IDArgs): Promise<void>;

  abstract setDatabase(name: string): Promise<void>;
  abstract deleteDatabase(name: string): Promise<void>;

  abstract loadDatabaseList(): Promise<Array<string>>;
  abstract getConnClasses(): Array<OBJIOItemClass>;

  getConnection(): ConnectionBase {
    return this.conn;
  }

  getDatabase() {
    return this.database;
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...DatabaseBase.SERIALIZE(),
    conn:     { type: 'object', const: true },
    database: { type: 'string', const: true }
  })
}

export class DatabaseBaseClient extends DatabaseBase {
  loadTableList() {
    return Promise.reject(`not implemented`);
  }

  loadAggrData() {
    return Promise.reject(`not implemented`);
  }

  loadTableRowsNum() {
    return Promise.reject(`not implemented`);
  }

  loadTableData() {
    return Promise.reject(`not implemented`);
  }

  createTempTable() {
    return Promise.reject(`not implemented`);
  }

  createTable() {
    return Promise.reject(`not implemented`);
  }

  pushData() {
    return Promise.reject(`not implemented`);
  }

  updateData() {
    return Promise.reject(`not implemented`);
  }

  deleteData() {
    return Promise.reject(`not implemented`);
  }

  deleteTable() {
    return Promise.reject(`not implemented`);
  }
}

export abstract class RemoteDatabaseClient extends RemoteDatabaseBase {
  loadTableList() {
    return Promise.reject(`not implemented`);
  }

  loadAggrData() {
    return Promise.reject(`not implemented`);
  }

  loadTableRowsNum() {
    return Promise.reject(`not implemented`);
  }

  loadTableData() {
    return Promise.reject(`not implemented`);
  }

  createTempTable() {
    return Promise.reject(`not implemented`);
  }

  createTable() {
    return Promise.reject(`not implemented`);
  }

  pushData() {
    return Promise.reject(`not implemented`);
  }

  updateData() {
    return Promise.reject(`not implemented`);
  }

  deleteData() {
    return Promise.reject(`not implemented`);
  }

  deleteTable() {
    return Promise.reject(`not implemented`);
  }

  setConnection() {
    return Promise.reject(`not implemented`);
  }

  setDatabase() {
    return Promise.reject(`not implemented`);
  }
  deleteDatabase() {
    return Promise.reject(`not implemented`);
  }

  loadDatabaseList() {
    return Promise.reject(`not implemented`);
  }
}
