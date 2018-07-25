import { TableHolder as TableHolderBase } from '../table-holder';
import { SERIALIZER } from 'objio';
import { Cells, LoadCellsArgs, SubtableAttrs } from '../table';
import { Table } from '../server/table';

export class TableHolder extends TableHolderBase<Table> {
  private subtable: string = '';
  private tableCounter: number = 0;

  constructor() {
    super();

    this.holder.setMethodsToInvoke({
      updateSubtable: (args: SubtableAttrs) => this.updateSubtable(args),
      loadCells: (args: LoadCellsArgs) => this.loadCells(args)
    });
  }

  loadCells(args: LoadCellsArgs): Promise<Cells> {
    if (this.subtable)
      args.table = this.subtable;

    return this.table.loadCells(args);
  }

  protected onLoad() {
    return super.onLoad().then(() => {
    });
  }

  protected onCreate() {
    return super.onCreate().then(() => {
    });
  }

  updateSubtable(args: SubtableAttrs): Promise<any> {
    this.tableCounter++;
    this.subtable = `${this.getTable()}_${this.tableCounter}`;
    return this.table.createSubtable({
      table: this.subtable,
      attrs: args
    });
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...TableHolderBase.SERIALIZE()
  })
}
