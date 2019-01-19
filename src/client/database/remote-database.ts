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
} from '../../base/database/table';
import { RemoteDatabaseBase } from '../../base/database/remote-database';
import { Connection } from './connection';

export interface RemoteDatabaseArgs {
  connection: Connection;
  database: string;
}

export class RemoteDatabase extends RemoteDatabaseBase {
  constructor(args?: RemoteDatabaseArgs) {
    super();

    if (args) {
      this.connection = args.connection;
      this.database = args.database;
    }
  }

  loadTableInfo(args: TableNameArgs): Promise<Array<ColumnAttr>> {
    return this.holder.invokeMethod({ method: 'loadTableInfo', args });
  }

  loadRowsCount(args: TableNameArgs): Promise<number> {
    return this.holder.invokeMethod({ method: 'loadRowsCount', args });
  }

  deleteTable(args: TableNameArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'deleteTable', args });
  }

  createTable(args: TableColsArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'createTable', args });
  }

  loadCells(args: LoadCellsArgs): Promise<Cells> {
    return this.holder.invokeMethod({ method: 'loadCells', args });
  }

  getNumStats(args: NumStatsArgs): Promise<NumStats> {
    return this.holder.invokeMethod({ method: 'getNumStats', args });
  }

  createSubtable(args: SubtableAttrs & { table: string }): Promise<CreateSubtableResult> {
    return this.holder.invokeMethod({ method: 'createSubtable', args });
  }

  pushCells(args: PushRowArgs & { table: string }): Promise<number> {
    return this.holder.invokeMethod({ method: 'pushCells', args });
  }
}
