import {
  TableColsArgs,
  ColumnAttr,
  LoadCellsArgs,
  Cells,
  NumStats,
  NumStatsArgs,
  CreateSubtableResult,
  SubtableAttrs,
  TableNameArgs,
  PushRowArgs
} from './table';
import { ObjectBase } from './object-base';

export abstract class DatabaseBase extends ObjectBase {
  abstract loadTableInfo(args: TableNameArgs): Promise<Array<ColumnAttr>>;
  abstract loadRowsCount(args: TableNameArgs): Promise<number>;
  abstract deleteTable(args: TableNameArgs): Promise<void>;
  abstract createTable(args: TableColsArgs): Promise<void>;
  abstract loadCells(args: LoadCellsArgs): Promise<Cells>;
  abstract getNumStats(args: NumStatsArgs): Promise<NumStats>;
  abstract createSubtable(args: SubtableAttrs & { table: string }): Promise<CreateSubtableResult>;
  abstract pushCells(args: PushRowArgs & { table: string }): Promise<number>;
}
