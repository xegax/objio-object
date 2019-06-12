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
import {
  TableColumn,
  LoadTableFileArgs,
  SetTableNameArgs,
  ModifyColumnArgs
} from './database-table-decl';

export {
  TableDataArgs,
  LoadTableDataResult as TableData,
  DatabaseHolderBase,
  ObjectBase,
  ObjProps
};

export abstract class DatabaseTableBase extends ObjectBase {
  protected db: DatabaseHolderBase;
  protected tableFileId: string;
  protected tableName: string;
  protected columns = Array<TableColumn>();

  abstract loadTableFile(args: LoadTableFileArgs): Promise<void>;

  abstract loadTableGuid(args: LoadTableGuidArgs): Promise<LoadTableGuidResult>;
  abstract loadTableRowsNum(args: TableGuid): Promise<number>;
  abstract loadTableData(args: LoadTableDataArgs): Promise<LoadTableDataResult>;

  abstract pushData(args: PushDataArgs): Promise<PushDataResult>;

  abstract setDatabase(args: IDArgs): Promise<void>;
  abstract setTableName(args: SetTableNameArgs): Promise<void>;
  abstract setTableFile(args: IDArgs): Promise<void>;
  
  abstract modifyColumns(args: ModifyColumnArgs): Promise<void>;

  getTableName(): string {
    return this.tableName;
  }

  getDatabase(): DatabaseHolderBase {
    return this.db;
  }

  static TYPE_ID = 'DATABASE-TABLE';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    db:           { type: 'object', const: true },
    tableName:    { type: 'string', const: true },
    tableFileId:  { type: 'string', const: true },
    columns:      { type: 'json', const: true }
  })
}

export class DatabaseTableClientBase extends DatabaseTableBase {
  pushData(args: PushDataArgs): Promise<PushDataResult> {
    return this.holder.invokeMethod({ method: 'pushData', args });
  }

  loadTableFile(args: IDArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'loadTableFile', args });
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

  setTableFile(args: IDArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'setTableFile', args });
  }

  modifyColumns(args: ModifyColumnArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'modifyColumns', args });
  }
}
