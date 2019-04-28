import {
  DatabaseHolderBase,
  DeleteTableArgs,
  DatabaseHolderArgs,
  CreateTableArgs,
  TableInfo,
  ColumnToCreate,
  ColumnInfo,
  TableData,
  PushDataArgs
} from '../../base/database-holder';
import { IDArgs } from '../../common/interfaces';
import { PushDataResult } from '../../base/database-holder';

export {
  ColumnInfo,
  ColumnToCreate
};

export class DatabaseHolder extends DatabaseHolderBase {
  constructor(args: DatabaseHolderArgs) {
    super(args);

    this.holder.setMethodsToInvoke({
      deleteTable: {
        method: (args: DeleteTableArgs) => this.deleteTable(args),
        rights: 'write'
      },
      createTable: {
        method: (args: CreateTableArgs) => this.createTable(args),
        rights: 'write'
      },
      pushData: {
        method: (args: PushDataArgs) => this.pushData(args),
        rights: 'write'
      },
      setConnection: {
        method: (args: IDArgs) => this.setConnection(args),
        rights: 'write'
      },
      setDatabase: {
        method: (args: { database: string }) => this.setDatabase(args.database),
        rights: 'write'
      }
    });
  }

  deleteTable(args: DeleteTableArgs) {
    return (
      this.impl.deleteTable(args)
      .then(res => {
        this.holder.save(true);
        return res;
      })
    )
  }

  createTable(args: CreateTableArgs): Promise<TableInfo> {
    return (
      this.impl.createTable(args)
      .then(res => {
        this.holder.save(true);
        return res;
      })
    );
  }

  pushData(args: PushDataArgs): Promise<PushDataResult> {
    return (
      this.impl.pushData(args)
      .then(res => {
        this.holder.save(true);
        return res;
      })
    );
  }

  setDatabase(database: string) {
    return (
      this.impl.setDatabase(database)
      .then(res => {
        this.holder.save(true);
        return res;
      })
    )
  }

  setConnection(args: IDArgs) {
    return (
      this.impl.setConnection(args)
      .then(res => {
        this.holder.save(true);
        return res;
      })
    );
  }
}
