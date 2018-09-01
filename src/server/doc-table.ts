import { OBJIOItem, SERIALIZER } from 'objio';
import { Table } from '../client/table';

export class DocTable extends OBJIOItem {
  protected table: Table;

  static TYPE_ID = 'DocTable';
  static SERIALIZE: SERIALIZER = () => ({
    table: { type: 'object' }
  })
}
