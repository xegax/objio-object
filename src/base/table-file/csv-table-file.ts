import { TableFileBase } from './index';
import { SERIALIZER } from 'objio';

export abstract class CSVTableFile extends TableFileBase {
  static TYPE_ID = 'CSVTableFile';
  static SERIALIZE: SERIALIZER = () => ({
    ...TableFileBase.SERIALIZE()
  })
}
