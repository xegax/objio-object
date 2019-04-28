import {
  TableBase,
  TableArgs,
  TableInfo,
  TableData,
  TableDataArgs,
  DatabaseHolderBase,
  TmpTableArgs
} from '../../base/database/table2';
import { IDArgs } from '../../common/interfaces';
import { TableFileBase } from '../../base/table-file';
import { OnRowsArgs } from '../../base/table-file/data-reading';
import { PushDataArgs, PushDataResult } from '../../base/database-holder';

export class Table2 extends TableBase {
  constructor(args) {
    super(args);

    this.holder.setMethodsToInvoke({
      pushData: {
        method: (args: PushDataArgs) => this.pushData(args),
        rights: 'write'
      },
      loadTableInfo: {
        method: (args: TableArgs) => this.loadTableInfo(args),
        rights: 'read'
      },
      loadTableRowsNum: {
        method: (args: TableArgs) => this.loadTableRowsNum(args),
        rights: 'read'
      },
      loadTableData: {
        method: (args: TableDataArgs) => this.loadTableData(args),
        rights: 'read'
      },
      setDatabase: {
        method: (args: IDArgs) => this.setDatabase(args),
        rights: 'write'
      },
      setTableName: {
        method: (args: TableArgs) => this.setTableName(args),
        rights: 'write'
      },
      setTableFile: {
        method: (args: IDArgs) => this.setTableFile(args),
        rights: 'write'
      },
      createTempTable: {
        method: (args: TmpTableArgs) => this.createTempTable(args),
        rights: 'read'
      },
      loadTableFile: {
        method: (args: IDArgs) => this.loadTableFile(args),
        rights: 'write'
      }
    });
  }

  private pushDataFromFile(fo: TableFileBase, rowsPerBunch: number): Promise<{ skipRows: number }> {
    if (!(fo instanceof TableFileBase))
      return Promise.reject('unknown type of source file');

    const result = { skipRows: 0 };
    const onRows = (args: OnRowsArgs) => {
      return (
        this.pushData({ tableName: this.tableName, rows: args.rows as any })
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
      fo.getDataReading().readRows({
        onRows,
        linesPerBunch: rowsPerBunch
      })
      .then(() => {
        this.setStatus('ok');
        return result;
      })
      .catch(e => {
        this.addError(e.toString());
        this.setStatus('ok');
        return result;
      })
    );
  }

  loadTableFile(args: IDArgs): Promise<void> {
    if (!this.db)
      return Promise.reject('Database is not selected');

    let tableFile: TableFileBase;
    return (
      this.holder.getObject<TableFileBase>(args.id)
      .then(table => {
        if (!(table instanceof TableFileBase))
          return Promise.reject(`Object is not valid`);
        
        tableFile = table;
        // drop table
        if (this.tableName) {
          return (
            this.db.deleteTable({ tableName: this.tableName })
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
            while(tables.some(t => tableName == t.tableName)) {
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
        this.db.createTable({ tableName, columns })
        .then(() => {
          this.tableName = tableName;
          this.holder.save();
          return this.pushDataFromFile(tableFile, 20)
        });
      })
    );
  }

  pushData(args: PushDataArgs): Promise<PushDataResult> {
    if (!this.db)
      return Promise.reject('Database is not selected');

    return this.db.pushData(args);
  }

  createTempTable(args: TmpTableArgs): Promise<TableInfo> {
    if (!this.db)
      return Promise.reject('Database is not selected');
    
    return this.db.createTempTable(args);
  }

  loadTableInfo(args: TableArgs): Promise<TableInfo> {
    if (!this.db)
      return Promise.reject('Database is not selected');

    return this.db.loadTableInfo(args);
  }

  loadTableRowsNum(args: TableArgs): Promise<number> {
    if (!this.db)
      return Promise.reject('Database is not selected');

    return this.db.loadTableRowsNum(args);
  }

  loadTableData(args: TableDataArgs): Promise<TableData> {
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
        if (!lst.find(t => t.tableName == this.tableName))
          this.tableName = '';
        this.holder.save();
      })
    );
  }

  setTableName(args: TableArgs): Promise<void> {
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
        if (!lst.find(t => t.tableName == args.tableName))
          return Promise.reject(`Table "${args.tableName}" not present in database`);
        
        this.tableName = args.tableName;
        this.holder.save();
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
