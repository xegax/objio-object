import { FileObjImpl } from './file-obj-impl';
import { SERIALIZER } from 'objio';
import { Columns, ColumnAttr } from './table';

export class CSVFileObject extends FileObjImpl {
  protected columns = Array<ColumnAttr>();

  getColumns(): Columns {
    return this.columns;
  }

  static TYPE_ID = 'CSVFile';
  static SERIALIZE: SERIALIZER = () => ({
    ...FileObjImpl.SERIALIZE(),
    columns: { type: 'json' }
  })
}
