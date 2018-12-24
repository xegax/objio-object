import { TableFileBase } from '../table-file';
import { SERIALIZER } from 'objio';

export abstract class JSONTableFile extends TableFileBase {
  static TYPE_ID = 'JSONTableFile';
  static SERIALIZE: SERIALIZER = () => ({
    ...TableFileBase.SERIALIZE()
  })
}
