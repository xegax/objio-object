import { SERIALIZER } from 'objio';
import { Table } from '../client/table';
import { ObjectBase } from './object-base';

export class DocTable extends ObjectBase {
  protected table: Table;

  static TYPE_ID = 'DocTable';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    table: { type: 'object' }
  })
}
