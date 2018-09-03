import { OBJIOItem } from 'objio';
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

export class Database extends ObjectBase {
  loadTableInfo = (args: TableNameArgs): Promise<Array<ColumnAttr>> => {
    return this.holder.invokeMethod('loadTableInfo', args);
  }

  loadRowsCount = (args: TableNameArgs): Promise<number> => {
    return this.holder.invokeMethod('loadRowsCount', args);
  }

  deleteTable = (args: TableNameArgs): Promise<void> => {
    return this.holder.invokeMethod('deleteTable', args);
  }

  createTable = (args: TableColsArgs): Promise<void> => {
    return this.holder.invokeMethod('createTable', args);
  }

  loadCells = (args: LoadCellsArgs): Promise<Cells> => {
    return this.holder.invokeMethod('loadCells', args);
  }

  getNumStats = (args: NumStatsArgs): Promise<NumStats> => {
    return this.holder.invokeMethod('getNumStats', args);
  }

  createSubtable = (args: SubtableAttrs & { table: string }): Promise<CreateSubtableResult> => {
    return this.holder.invokeMethod('createSubtable', args);
  }

  pushCells = (args: PushRowArgs & { table: string }): Promise<number> => {
    return this.holder.invokeMethod('pushCells', args);
  }
}
