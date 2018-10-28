import { SERIALIZER } from 'objio';
import { TableFileObject } from './table-file-object';

export class JSONFileObject extends TableFileObject {
  static TYPE_ID = 'JSONFileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...TableFileObject.SERIALIZE()
  })
}
