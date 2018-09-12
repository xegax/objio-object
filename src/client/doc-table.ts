import { SERIALIZER } from 'objio';
import { RenderListModel } from 'ts-react-ui/list';
import { timer, cancelable, Cancelable } from 'objio/common/promise';
import {
  CreateSubtableResult,
  ExecuteArgs,
  SubtableAttrs,
  ColumnAttr
} from './table';
import { DocTable as DocTableBase } from '../server/doc-table';
import { CSVFileObject } from './csv-file-object';
import { Table } from './table';
import { Database } from './database';

export interface DocTableArgs {
  source: CSVFileObject;
  dest: Database;
  tableName: string;
}

export class DocTable extends DocTableBase {
  private render = new RenderListModel(0, 20);
  private lastLoadTimer: Cancelable;
  private maxTimeBetweenRequests: number = 300;
  private totalRows: number = 0;
  private cols = Array<ColumnAttr>();

  constructor(args?: DocTableArgs) {
    super();

    if (args) {
      if (!args.dest)
        throw 'database not found';

      this.table = new Table({ source: args.dest });
    }

    this.render.setHandler({
      loadItems: (from, count) => {
        if (this.lastLoadTimer) {
          this.lastLoadTimer.cancel();
          this.lastLoadTimer = null;
        }

        this.lastLoadTimer = cancelable(timer(this.maxTimeBetweenRequests));
        return this.lastLoadTimer.then(() => {
          this.lastLoadTimer = null;
          return this.table.loadCells({ first: from, count });
        });
      }
    });

    this.holder.addEventHandler({
      onLoad: () => {
        this.totalRows = this.table.getTotalRowsNum();
        this.cols = this.table.getColumns();
        this.holder.notify();
        this.onInit();
        return Promise.resolve();
      },
      onCreate: () => {
        this.onInit();
        return this.execute({
          fileObjId: args.source.holder.getID(),
          columns: args.source.getColumns(),
          table: args.tableName
        });
      },
      onObjChange: () => {
        if (this.totalRows == this.table.getTotalRowsNum())
          return;

        this.totalRows = this.table.getTotalRowsNum();
        this.cols = this.table.getColumns();
        this.holder.notify();
      }
    });
  }

  onInit() {
    this.table.holder.addEventHandler({
      onObjChange: () => {
        if (!this.table.isStatusValid()) {
          this.holder.delayedNotify();
          return;
        }

        this.totalRows = this.table.getTotalRowsNum();
        this.cols = this.table.getColumns();
        this.holder.notify();
      }
    });
  }

  getTable(): string {
    return this.table.getTable();
  }

  getTableRef(): Table {
    return this.table;
  }

  getFileObjId(): string {
    return this.table.getFileObjId();
  }

  getLastExecuteTime(): number {
    return this.table.getLastExecuteTime();
  }

  updateSubtable(args: Partial<SubtableAttrs>): Promise<CreateSubtableResult> {
    return this.table.createSubtable(args);
  }

  getTotalRowsNum(): number {
    return this.totalRows;
  }

  getColumns(): Array<ColumnAttr> {
    return this.cols;
  }

  getAllColumns(): Array<ColumnAttr> {
    return this.table.getColumns();
  }

  execute(args: ExecuteArgs): Promise<any> {
    this.render.clearCache(false);
    return this.table.execute(args);
  }

  getRender(): RenderListModel {
    return this.render;
  }

  static TYPE_ID = 'DocTable';
  static SERIALIZE: SERIALIZER = () => ({
    ...DocTableBase.SERIALIZE()
  })
}
