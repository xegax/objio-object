import { Columns, ColumnAttr } from './table';
import { FileObject } from './file-object';
import { SERIALIZER } from 'objio';
import { ClientView } from './client-class';

export class CSVFileObject extends FileObject {
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

  static TYPE_ID = 'CSVFileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...FileObject.SERIALIZE(),
    columns: { type: 'json' }
  })

  static getClientViews(): Array<ClientView> {
    return [];
  }
}
