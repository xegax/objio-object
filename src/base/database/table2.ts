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
  PushDataResult
} from './database-decl';
import { DatabaseHolderBase } from './database-holder';
import { IDArgs } from '../../common/interfaces';

export {
  TableDataArgs,
  LoadTableDataResult as TableData,
  DatabaseHolderBase,
  ObjectBase,
  ObjProps
};

export interface LoadTableFileArgs {
  id: string;
}

export interface SetTableNameArgs {
  tableName: string;
}

export abstract class TableBase extends ObjectBase {
  protected db: DatabaseHolderBase;
  protected tableFileId: string;
  protected tableName: string;

  abstract loadTableFile(args: LoadTableFileArgs): Promise<void>;
  
  abstract loadTableGuid(args: LoadTableGuidArgs): Promise<LoadTableGuidResult>;
  abstract loadTableRowsNum(args: TableGuid): Promise<number>;
  abstract loadTableData(args: LoadTableDataArgs): Promise<LoadTableDataResult>;

  abstract pushData(args: PushDataArgs): Promise<PushDataResult>;
  
  abstract setDatabase(args: IDArgs): Promise<void>;
  abstract setTableName(args: SetTableNameArgs): Promise<void>;
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
