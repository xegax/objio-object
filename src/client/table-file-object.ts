import { SERIALIZER } from 'objio';
import { FileObject } from './file-object';
import { Columns, ColumnAttr } from '../base/table';

export class TableFileObject extends FileObject {
  protected columns = Array<ColumnAttr>();

  getColumns(): Columns {
    return this.columns;
  }

  setColumn(col: Partial<ColumnAttr>): void {
    const colItem = this.columns.find(column => column.name == col.name);
    if (!colItem)
      return;

    let changes = 0;
    Object.keys(col).forEach(k => {
      if (col[k] == colItem[k])
        return;

      changes++;
      colItem[k] = col[k];
    });

    if (changes == 0)
      return;

    this.holder.save();
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...FileObject.SERIALIZE(),
    columns: { type: 'json' }
  })
}
