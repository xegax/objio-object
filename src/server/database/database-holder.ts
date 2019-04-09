import {
  DatabaseHolderBase,
  DeleteTableArgs,
  DatabaseHolderArgs,
  CreateTableArgs
} from '../../base/database-holder';
import { IDArgs } from '../../common/interfaces';

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

  createTable(args: CreateTableArgs) {
    return (
      this.impl.createTable(args)
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
