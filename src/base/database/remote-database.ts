import { SERIALIZER } from 'objio';
import { DatabaseBase as Base, TableInfo } from './database';
import { ConnectionBase } from './connection';

export abstract class RemoteDatabaseBase extends Base {
  protected database: string;
  protected connection: ConnectionBase;

  getDatabase(): string {
    return this.database;
  }

  getTables(): Array<TableInfo> {
    return this.tables;
  }

  static TYPE_ID = 'RemoteDatabase';
  static SERIALIZE: SERIALIZER = () => ({
    ...Base.SERIALIZE(),
    'database':   { type: 'string', const: true },
    'connection': { type: 'object', const: true }
  })
}
