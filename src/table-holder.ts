import {
  Table,
  TableArgs,
  Cells,
  Range,
  Row,
  inRange,
  ColumnAttr,
  PushRowArgs,
  RemoveRowsArgs,
  SubtableAttrs,
  SortPair,
  LoadCellsArgs
} from './table';
import { SERIALIZER, OBJIOItem, Cancelable, cancelable } from 'objio';
import { StateObject } from './state-object';

export class TableHolder<T extends Table = Table> extends OBJIOItem {
  private cells: Cells = [];
  protected table: T;

  private columns: Array<string> = [];
  private sort: Array<SortPair> = [];

  private selRowsRange: Range = { first: 0, count: 100 };
  private cellsLoading: Cancelable<Cells> = null;

  constructor() {
    super();

    this.holder.addEventHandler({
      onLoad: () => this.onLoad(),
      onCreate: () => this.onCreate(),
      onObjChange: () => this.updateCells().then(() => this.holder.notify())
    });

    this.table = new Table() as T;
  }

  execute(args: TableArgs): Promise<any> {
    return this.table.execute(args);
  }

  getState(): StateObject {
    return this.table.getState();
  }

  protected onLoad(): Promise<any> {
    this.subscribeOnTable();
    return this.updateCells();
  }

  protected onCreate(): Promise<any> {
    this.subscribeOnTable();
    return Promise.resolve();
  }

  private subscribeOnTable() {
    this.table.holder.addEventHandler({
      onObjChange: () => {
        if (!this.table.getState().isValid())
          return;

        this.updateCells().then(() => this.holder.notify());
      }
    });
  }

  protected loadCells(args: LoadCellsArgs): Promise<Cells> {
    return this.holder.invokeMethod('loadCells', args);
  }

  private updateCells(): Promise<Cells> {
    return this.loadCells(this.selRowsRange)
      .then((cells: Cells) => {
        return this.cells = cells;
      });
  }

  getSelRowsRange(): Range {
    return {
      first: this.selRowsRange.first,
      count: Math.min(
        this.selRowsRange.first + this.selRowsRange.count,
        this.table.getTotalRowsNum()
      ) - this.selRowsRange.first
    };
  }

  pushCells(args: PushRowArgs): Promise<number> {
    return this.table.pushCells(args);
  }

  getTable(): string {
    return this.table.getTable();
  }

  getAllColumns(): Array<ColumnAttr> {
    return this.table.getColumns();
  }

  getColumns(): Array<ColumnAttr> {
    return this.table.getColumns().filter(col => {
      return this.columns.length == 0 || this.columns.indexOf(col.name) != -1;
    });
  }

  removeRows(args: RemoveRowsArgs): Promise<any> {
    return this.table.removeRows(args);
  }

  getIdColumn(): string {
    return this.table.getIdColumn();
  }

  getOrLoadRow(rowIdx: number): Promise<Cells> | Row {
    if (!this.cellsLoading) {
      const row = this.cells[rowIdx - this.selRowsRange.first];
      if (row)
        return row;
    }

    if (inRange(rowIdx, this.selRowsRange) && this.cellsLoading)
      return this.cellsLoading;

    this.selRowsRange.first = Math.max(0, Math.round(rowIdx - this.selRowsRange.count / 2));

    if (this.cellsLoading)
      this.cellsLoading.cancel();

    this.cellsLoading = cancelable(this.loadCells(this.selRowsRange));
    return this.cellsLoading.then((cells: Cells) => {
      this.cellsLoading = null;
      return this.cells = cells;
    });
  }

  getCells(): Cells {
    return this.cells;
  }

  getTotalRowsNum(): number {
    return this.table.getTotalRowsNum();
  }

  updateSubtable(args: Partial<SubtableAttrs>): Promise<any> {
    this.sort = args.sort || this.sort;
    this.columns = args.cols || this.columns;
    return this.holder.invokeMethod('updateSubtable', args).then(() => {
      this.updateCells();
      this.holder.save();
    });
  }

  getSort(): Array<SortPair> {
    return this.sort;
  }

  static TYPE_ID = 'TableHolder';
  static SERIALIZE: SERIALIZER = () => ({
    table: {type: 'object'},
    columns: {type: 'json'},
    sort: {type: 'json'}
  })
}
