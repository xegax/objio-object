import { FileObjImpl } from './file-obj-impl';
import { SERIALIZER, isEquals } from 'objio';
import { Columns, ColumnAttr } from './table';

export class CSVFileObject extends FileObjImpl {
  protected columns = Array<ColumnAttr>();

  getColumns(): Columns {
    return this.columns;
  }

  setColumn(attr: Partial<ColumnAttr>): void {
    const i = this.columns.findIndex(col => col.name == attr.name);
    if (i == -1)
      return;

    const prev = {...this.columns[i]};
    this.columns[i] = {...this.columns[i], ...attr};
    if (!isEquals(this.columns[i], prev)) {
      this.holder.notify();
      this.holder.save();
    }
  }

  static TYPE_ID = 'CSVFile';
  static SERIALIZE: SERIALIZER = () => ({
    ...FileObjImpl.SERIALIZE(),
    columns: { type: 'json' }
  })
}
