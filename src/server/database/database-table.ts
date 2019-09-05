import {
  DatabaseTableBase,
  TableData,
  DatabaseHolderBase
} from '../../base/database/database-table';
import { IDArgs } from '../../common/interfaces';
import { TableFileBase } from '../../base/table-file';
import { OnRowsArgs } from '../../base/table-file/data-reading-decl';
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
import { DatabaseHolder } from './database-holder';
import { SetTableNameArgs } from '../../base/database/database-table-decl';
import { ApprMapServerBase } from '../../base/appr-map';
import { makeTableAppr } from '../../base/database/database-table-appr';
import { LoadTableFileArgs } from '../../base/database/database-table-decl';

export class DatabaseTable extends DatabaseTableBase {
  constructor(args) {
    super(args);

    this.appr = new ApprMapServerBase(makeTableAppr());
    this.holder.addEventHandler({
      onLoad: () => {
        this.appr.setSchema(makeTableAppr());
        return Promise.resolve();
      }
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
      },
      setTableFile: {
        method: (args: IDArgs) => this.setTableFile(args),
        rights: 'write'
      },
      loadTableFile: {
        method: (args: LoadTableFileArgs) => this.loadTableFile(args),
        rights: 'write'
      }
    });
  }

  private pushDataFromFile(fo: TableFileBase, rowsPerBunch: number): Promise<{ skipRows: number }> {
    if (!(fo instanceof TableFileBase))
      return Promise.reject('unknown type of source file');

    const result = { skipRows: 0 };
    const table = this.tableName;
    const onRows = (args: OnRowsArgs) => {
      return (
        this.pushData({
          table,
          rows: args.rows as any,
          updateVersion: false
        })
        .then(res => {
          result.skipRows += args.rows.length - res.pushRows;
          this.setProgress(args.progress);
        })
        .catch(e => {
          this.setStatus('error');
          this.addError(e.toString());
          return Promise.reject(e);
        })
      );
    };

    this.setStatus('in progress');
    return (
      fo.getDataReader().readRows({
        onRows,
        linesPerBunch: rowsPerBunch
      })
      .then(() => {
        // need update version
        this.db.holder.save(true);
        (this.db as DatabaseHolder).invalidateGuids(table);
        this.setStatus('ok');
        return result;
      })
      .catch(e => {
        this.db.holder.save(true);
        this.addError(e.toString());
        this.setStatus('ok');
        return result;
      })
    );
  }

  loadTableFile(args: LoadTableFileArgs): Promise<void> {
    if (!this.db)
      return Promise.reject('Database is not selected');

    let tableFile: TableFileBase;
    return (
      this.holder.getObject<TableFileBase>(args.tableFileId)
      .then(table => {
        if (!(table instanceof TableFileBase))
          return Promise.reject(`Object is not valid`);

        tableFile = table;
        // drop table
        if (this.tableName) {
          return (
            this.db.deleteTable({ table: this.tableName })
            .then(() => this.tableName)
          );
        }

        // generate table name
        return (
          this.db.loadTableList()
          .then(tables => {
            let objName = table.getName().toLowerCase().replace(/[\?\-\,\.]/g, '_');
            let tableName = objName;
            let idx = 0;
            while (tables.some(t => tableName == t.table)) {
              tableName = objName + '_' + idx++;
            }

            return tableName;
          })
        );
      })
      .then(tableName => {
        const columns = tableFile.getColumns().map(col => {
          return {
            colName: col.name,
            colType: col.type
          };
        });

        // start to push data from file
        this.db.createTable({ table: tableName, columns })
        .then(() => {
          this.tableName = tableName;
          this.holder.save();
          return this.pushDataFromFile(tableFile, 20);
        });
      })
    );
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

  setTableFile(args: IDArgs): Promise<void> {
    if (!this.db)
      return Promise.reject('Database is not selected');

    if (this.tableFileId == args.id)
      return Promise.resolve();

    if (args.id == null) {
      if (this.tableFileId == null)
        return Promise.resolve();

      this.tableFileId = null;
      this.holder.save();
      return Promise.resolve();
    }

    return (
      this.holder.getObject<TableFileBase>(args.id)
      .then(tableFile => {
        if (tableFile && !(tableFile instanceof TableFileBase))
          return Promise.reject('Invalid table file');

        this.tableFileId = tableFile.getID();
        this.holder.save();
      })
    );
  }
}
