import {
  DatabaseTableBase,
  TableData,
  DatabaseHolderBase
} from '../../base/database/database-table';
import { IDArgs } from '../../common/interfaces';
import {
  LoadTableGuidArgs,
  TableGuid,
  LoadTableDataArgs,
  LoadTableGuidResult
} from '../../base/database/database-holder-decl';
import {
  PushDataArgs,
  PushDataResult
} from '../../base/database/database-decl';
import { SetTableNameArgs } from '../../base/database/database-table-decl';
import { ApprMapServerBase } from '../../base/appr-map';
import { makeTableAppr } from '../../base/database/database-table-appr';

export class DatabaseTable extends DatabaseTableBase {
  constructor(args) {
    super(args);

    this.appr = new ApprMapServerBase(makeTableAppr());
    this.holder.addEventHandler({
      onLoad: this.onInit
    });

    this.holder.setMethodsToInvoke({
      pushData: {
        method: (args: PushDataArgs) => this.pushData(args),
        rights: 'write'
      },
      loadTableGuid: {
        method: (args: LoadTableGuidArgs) => this.loadTableGuid(args),
        rights: 'read'
      },
      loadTableRowsNum: {
        method: (args: TableGuid) => this.loadTableRowsNum(args),
        rights: 'read'
      },
      loadTableData: {
        method: (args: LoadTableDataArgs) => this.loadTableData(args),
        rights: 'read'
      },
      setDatabase: {
        method: (args: IDArgs) => this.setDatabase(args),
        rights: 'write'
      },
      setTableName: {
        method: (args: SetTableNameArgs) => this.setTableName(args),
        rights: 'write'
      }
    });
  }

  private onInit = () => {
    const tableVersion = this.db.getTableVersion(this.getTableName());
    let p = Promise.resolve();
    if (tableVersion != this.tableVersion)
      p = p.then(() => this.updateColumns());

    // database changed
    this.db.holder.addEventHandler({
      onObjChange: () => {
        const newTableVersion = this.db.getTableVersion(this.getTableName());
        if (this.tableVersion != newTableVersion) {
          this.tableVersion = newTableVersion;
          this.updateColumns();
        }
      }
    });

    this.appr.setSchema(makeTableAppr());
    return p;
  }

  pushData(args: PushDataArgs): Promise<PushDataResult> {
    if (!this.db)
      return Promise.reject('Database is not selected');

    return this.db.pushData(args);
  }

  loadTableGuid(args: LoadTableGuidArgs): Promise<LoadTableGuidResult> {
    if (!this.db)
      return Promise.reject('Database is not selected');

    return this.db.loadTableGuid(args);
  }

  loadTableRowsNum(args: TableGuid): Promise<number> {
    if (!this.db)
      return Promise.reject('Database is not selected');

    return this.db.loadTableRowsNum(args);
  }

  loadTableData(args: LoadTableDataArgs): Promise<TableData> {
    if (!this.db)
      return Promise.reject('Database is not selected');

    return this.db.loadTableData(args);
  }

  setDatabase(args: IDArgs): Promise<void> {
    if (this.db && this.db.holder.getID() == args.id)
      return Promise.resolve();

    return (
      this.holder.getObject(args.id)
      .then(db => {
        if (!(db instanceof DatabaseHolderBase))
          return Promise.reject('Object is not database');

        this.db = db;
        return this.db.loadTableList();
      }).then(lst => {
        if (!lst.find(t => t.table == this.tableName))
          this.tableName = '';
        this.holder.save();
      })
    );
  }

  private updateColumns() {
    return (
      this.db.loadTableList()
      .then(lst => {
        const tableName = this.tableName;
        const t = lst.find(t => t.table == tableName);
        if (!t)
          return Promise.reject(`Table "${tableName}" not present in database`);

        this.columns = t.columns;
        this.holder.save();
      })
    );
  }

  setTableName(args: SetTableNameArgs): Promise<void> {
    if (!this.db)
      return Promise.reject('Database is not selected');

    if (this.tableName == args.tableName)
      return Promise.resolve();

    if (args.tableName == null) {
      this.tableName = '';
      this.holder.save(true);
      return Promise.resolve();
    }

    return (
      this.db.loadTableList()
      .then(lst => {
        const t = lst.find(t => t.table == args.tableName);
        if (!t)
          return Promise.reject(`Table "${args.tableName}" not present in database`);

        this.columns = t.columns;
        this.tableName = args.tableName;
        this.holder.save();

        this.appr.resetToDefaultKey('sort', 'order');
        this.appr.holder.save();
      })
    );
  }
}
