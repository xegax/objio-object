import {
  SERIALIZER
} from 'objio';
import { Database } from './database';
import { ObjectBase } from './object-base';

export interface TableNameArgs {
  table: string;
}
export interface TableColsArgs {
  table: string;
  columns: Columns;
}

export interface NumStats {
  min: number;
  max: number;
}

export interface NumStatsArgs {
  column: string;
  table?: string;
}

export interface CreateSubtableResult {
  subtable: string;
  columns: Array<ColumnAttr>;
  rowsNum: number;
}

export interface SortPair {
  column: string;
  dir: 'asc' | 'desc';
}

export interface ValueCond {
  column: string;
  value: string | Array<string | number> | CompoundCond;
  inverse?: boolean;
}

export interface CompoundCond {
  values: Array<Condition>;
  op: 'or' | 'and';
  table?: string;
}

export type Condition = ValueCond | CompoundCond;

export interface ColumnAttr {
  name: string;
  type: string;
  notNull?: boolean;
  unique?: boolean;
  primary?: boolean;
  autoInc?: boolean;
  discard?: boolean;
  index?: boolean;
  removeQuotes?: boolean; //  default true
}

export interface ExecuteArgs {
  table: string;
  columns?: Array<ColumnAttr>;
  fileObjId?: string;           // if not defined will be created new table
  idColumn?: string;
  // idColumn defined, column is not found - create primary key column with name = idColumn
  // idColumn defined, column is found - this column will be primary key
  // idColumn not defined - we will try to create and insert idColumn = 'row-uid' or 'row-uid-%%%%%'
}

export interface Distinct {
  column: string;
}

export interface LoadTableInfoArgs {
  table: string;
}

export interface SubtableAttrs {
  sort: Array<SortPair>;
  cols: Array<string>;
  distinct?: Distinct;
  filter?: Condition | string;
}

export interface Range {
  first: number;
  count: number;
}

export interface PushRowArgs {
  updRowCounter?: boolean;
  values: {[column: string]: Array<string>};
}

export interface UpdateRowArgs {
  rowId: string;
  values: {[column: string]: string};
}

export interface RemoveRowsArgs {
  rowIds: Array<string>;
}

export interface LoadCellsArgs extends Range {
  table?: string;
  filter?: Condition;
}

export function inRange(idx: number, range: Range): boolean {
  return idx >= range.first && idx < range.first + range.count;
}

export type Columns = Array<ColumnAttr>;
export type Row = Array<string>;
export type Cells = Array<Row>;

export interface TableArgs {
  source: Database;
}

export class Table extends ObjectBase {
  protected db: Database;
  protected table: string;
  protected columns: Columns = Array<ColumnAttr>();
  protected idColumn: string = 'row_uid';
  protected lastExecuteTime: number = 0;
  protected fileObjId: string;

  protected totalRowsNum: number = 0;

  constructor(args: TableArgs) {
    super();

    if (args)
      this.db = args.source;
  }

  getDatabase(): Database {
    return this.db;
  }

  execute(args: ExecuteArgs): Promise<any> {
    return this.holder.invokeMethod('execute', args);
  }

  getLastExecuteTime(): number {
    return this.lastExecuteTime;
  }

  getFileObjId(): string {
    return this.fileObjId;
  }

  findColumn(name: string): ColumnAttr {
    return this.columns.find(col => col.name == name);
  }

  getTotalRowsNum(): number {
    return this.totalRowsNum;
  }

  getTable(): string {
    return this.table;
  }

  getColumns(): Array<ColumnAttr> {
    return this.columns;
  }

  loadCells(args: LoadCellsArgs): Promise<Cells> {
    return this.holder.invokeMethod('loadCells', args);
  }

  pushCells(args: PushRowArgs): Promise<number> {
    return this.holder.invokeMethod('pushCells', args);
  }

  updateCells(args: UpdateRowArgs): Promise<void> {
    return this.holder.invokeMethod('updateCell', args);
  }

  removeRows(args: RemoveRowsArgs): Promise<any> {
    return this.holder.invokeMethod('removeRows', args);
  }

  createSubtable(args: Partial<SubtableAttrs>): Promise<CreateSubtableResult> {
    return this.holder.invokeMethod('createSubtable', args);
  }

  getNumStats(args: NumStatsArgs): Promise<NumStats> {
    return this.holder.invokeMethod('getNumStats', args);
  }

  loadTableInfo(args: LoadTableInfoArgs): Promise<{ columns: Columns, totalRows: number }> {
    return this.holder.invokeMethod('loadTableInfo', args);
  }

  getIdColumn(): string {
    return this.idColumn;
  }

  static TYPE_ID = 'Table';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    'table':           { type: 'string'  },
    'columns':         { type: 'json'    },
    'totalRowsNum':    { type: 'integer' },
    'idColumn':        { type: 'string'  },
    'lastExecuteTime': { type: 'number'  },
    'fileObjId':       { type: 'string'  },
    'db':              { type: 'object'  }
  })
}
