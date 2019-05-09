import {
  DeleteTableArgs,
  CreateTableArgs,
  ColumnToCreate,
  TableDesc,
  ColumnInfo,
  PushDataArgs,
  PushDataResult,
  DeleteDataArgs,
  UpdateDataArgs
} from '../../base/database-holder-decl';
import { DatabaseHolderBase, DatabaseHolderArgs } from '../../base/database-holder';
import { IDArgs } from '../../common/interfaces';

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
      deleteData: {
        method: (args: DeleteDataArgs) => this.deleteData(args),
        rights: 'write'
      },
      setConnection: {
        method: (args: IDArgs) => this.setConnection(args),
        rights: 'write'
      },
      setDatabase: {
        method: (args: { database: string }) => this.setDatabase(args.database),
        rights: 'write'
      },
      updateData: {
        method: (args: UpdateDataArgs) => this.updateData(args),
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

  createTable(args: CreateTableArgs): Promise<TableDesc> {
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
        if (args.updateVersion != false)
          this.holder.save(true);
        return res;
      })
    );
  }

  updateData(args: UpdateDataArgs): Promise<void> {
    return (
      this.impl.updateData(args)
      .then(res => {
        this.holder.save(true);
        return res;
      })
    );
  }

  deleteData(args: DeleteDataArgs): Promise<void> {
    return (
      this.impl.deleteData(args)
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
