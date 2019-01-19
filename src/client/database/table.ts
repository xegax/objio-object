import {
  TableBase,
  NumStats,
  NumStatsArgs,
  CreateSubtableResult,
  ExecuteArgs,
  LoadTableInfoArgs,
  SubtableAttrs,
  PushRowArgs,
  UpdateRowArgs,
  RemoveRowsArgs,
  LoadCellsArgs,
  Columns,
  Cells,
  PushCellsResult
} from '../../base/database/table';

export class Table extends TableBase {
  execute(args: ExecuteArgs): Promise<any> {
    return this.holder.invokeMethod({ method: 'execute', args });
  }

  loadCells(args: LoadCellsArgs): Promise<Cells> {
    return this.holder.invokeMethod({ method: 'loadCells', args });
  }

  pushCells(args: PushRowArgs): Promise<PushCellsResult> {
    return this.holder.invokeMethod({ method: 'pushCells', args });
  }

  updateCells(args: UpdateRowArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'updateCell', args });
  }

  removeRows(args: RemoveRowsArgs): Promise<any> {
    return this.holder.invokeMethod({ method: 'removeRows', args });
  }

  createSubtable(args: Partial<SubtableAttrs>): Promise<CreateSubtableResult> {
    return this.holder.invokeMethod({ method: 'createSubtable', args });
  }

  getNumStats(args: NumStatsArgs): Promise<NumStats> {
    return this.holder.invokeMethod({method: 'getNumStats', args });
  }

  loadTableInfo(args: LoadTableInfoArgs): Promise<{ columns: Columns, totalRows: number }> {
    return this.holder.invokeMethod({ method: 'loadTableInfo', args });
  }
}
