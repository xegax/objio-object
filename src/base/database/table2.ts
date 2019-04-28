import { ObjectBase, ObjProps } from '../object-base';
import { SERIALIZER } from 'objio';
import {
  DatabaseHolderBase,
  TableArgs,
  TableInfo,
  TableDataArgs,
  TableData,
  TmpTableArgs,
  PushDataArgs,
  PushDataResult
} from '../database-holder';
import { IDArgs } from '../../common/interfaces';

export {
  TableArgs,
  TableInfo,
  TableDataArgs,
  TableData,
  TmpTableArgs,
  DatabaseHolderBase,
  ObjectBase,
  ObjProps
};

export interface LoadTableFileArgs {
  id: string;
}

export abstract class TableBase extends ObjectBase {
  protected db: DatabaseHolderBase;
  protected tableFileId: string;
  protected tableName: string;

  abstract loadTableFile(args: LoadTableFileArgs): Promise<void>;
  abstract createTempTable(args: TmpTableArgs): Promise<TableInfo>;
  abstract loadTableInfo(args: TableArgs): Promise<TableInfo>;
  abstract loadTableRowsNum(args: TableArgs): Promise<number>;
  abstract loadTableData(args: TableDataArgs): Promise<TableData>;
  abstract pushData(args: PushDataArgs): Promise<PushDataResult>;
  
  abstract setDatabase(args: IDArgs): Promise<void>;
  abstract setTableName(args: TableArgs): Promise<void>;
  abstract setTableFile(args: IDArgs): Promise<void>;

  getTableName(): string {
    return this.tableName;
  }

  getDatabase(): DatabaseHolderBase {
    return this.db;
  }

  static TYPE_ID = 'Table2';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    db:           { type: 'object', const: true },
    tableName:    { type: 'string', const: true },
    tableFileId:  { type: 'string', const: true }
  });
}
