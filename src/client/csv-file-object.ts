import { SERIALIZER } from 'objio';
import { TableFileObject } from './table-file-object';

export class CSVFileObject extends TableFileObject {
  static TYPE_ID = 'CSVFileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...TableFileObject.SERIALIZE(),
    columns: { type: 'json' }
  })
}
