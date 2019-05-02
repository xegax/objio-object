import { SERIALIZER, OBJIOItemClass } from 'objio';
import { ObjectBase } from './object-base';
import { StrMap, IDArgs } from '../common/interfaces';
import { ConnectionBase } from './database/connection';

export interface ValueCond {
  column: string;
  value: string | Array<string | number> | CompoundCond;
  like?: boolean;
  inverse?: boolean;
}

export interface CompoundCond {
  values: Array<ValueCond | CompoundCond>;
  op: 'or' | 'and';
  table?: string;
}

export interface TableArgs {
  tableName: string;
}

export interface TmpTableArgs {
  tableName: string;
  columns?: Array<string>;
}

export interface ColumnInfo {
  colName: string;
  colType: string;
}

export interface ColumnToCreate extends ColumnInfo {
  notNull?: boolean;
  unique?: boolean;
  primary?: boolean;
  autoInc?: boolean;
  index?: boolean;
}

export interface TableInfo {
  tableName: string;
  columns: Array<ColumnInfo>;
  rowsNum: number;
}

export interface TableDataArgs {
  tableName: string;
  columns?: Array<string>;
  fromRow: number;
  rowsNum: number;
}

export interface TableData {
  rows: Array<StrMap>;
  fromRow: number;
  rowsNum: number;
}

export interface PushDataArgs {
  tableName: string;
  rows: Array<StrMap>;
  updateVersion?: boolean;
}

export interface PushDataResult {
  pushRows: number;
}

export interface DeleteDataArgs {
  tableName: string;
  cond: CompoundCond;
}

export interface CreateTableArgs {
  tableName: string;
  columns: Array<ColumnToCreate>;
}

export interface DeleteTableArgs {
  tableName: string;
}

export abstract class DatabaseBase2 extends ObjectBase {
  protected conn: ConnectionBase;
  protected database: string;
  // conn and database are using by remote database

  abstract loadTableList(): Promise<Array<TableInfo>>;
  abstract loadTableInfo(args: TableArgs): Promise<TableInfo>;
  abstract loadTableRowsNum(args: TableArgs): Promise<number>;
  abstract loadTableData(args: TableDataArgs): Promise<TableData>;

  abstract createTempTable(args: TmpTableArgs): Promise<TableInfo>;

  abstract createTable(args: CreateTableArgs): Promise<TableInfo>;
  abstract deleteTable(args: DeleteTableArgs): Promise<void>;
  abstract pushData(args: PushDataArgs): Promise<PushDataResult>;
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

  loadTableList(): Promise<Array<TableInfo>> {
    return this.impl.loadTableList();
  }

  loadTableInfo(args: TableArgs): Promise<TableInfo> {
    return this.impl.loadTableInfo(args);
  }

  loadTableRowsNum(args: TableArgs): Promise<number> {
    return this.impl.loadTableRowsNum(args);
  }

  loadTableData(args: TableDataArgs): Promise<TableData> {
    return this.impl.loadTableData(args);
  }

  createTempTable(args: TmpTableArgs): Promise<TableInfo> {
    return this.impl.createTempTable(args);
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
