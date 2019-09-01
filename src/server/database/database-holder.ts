import {
  GuidMapData,
  LoadTableGuidArgs,
  LoadAggrDataArgs,
  LoadTableGuidResult,
  LoadTableDataArgs,
  LoadAggrDataResult,
  TableGuid,
  ImportTableArgs
} from '../../base/database/database-holder-decl';
import {
  DeleteTableArgs,
  CreateTableArgs,
  ColumnInfoFull,
  TableDesc,
  ColumnInfo,
  PushDataArgs,
  PushDataResult,
  DeleteDataArgs,
  UpdateDataArgs,
  TableDescShort,
  LoadTableDataResult
} from '../../base/database/database-decl';
import { DatabaseHolderBase } from '../../base/database/database-holder';
import { IDArgs } from '../../common/interfaces';
import { TableFileBase } from '../../base/table-file';
import { OnRowsArgs } from '../../base/table-file/data-reading';

export {
  ColumnInfo,
  ColumnInfoFull
};

function getArgsKey(args: LoadTableGuidArgs): string {
  return [
    args.table,
    args.cond,
    (args.columns || []).join(','),
    (args.order || []),
    (args.distinct || '')
  ].map(k => JSON.stringify(k)).join('-');
}

export class DatabaseHolder extends DatabaseHolderBase {
  protected guidMap: {[guid: string]: GuidMapData} = {};
  protected argsToGuid: {[argsKey: string]: string} = {};
  protected tableList: Array<TableDesc> = null;

  protected tmpTableCounter = 0;

  constructor(args) {
    super(args);

    this.holder.setMethodsToInvoke({
      setConnection: {
        method: (args: IDArgs) => this.setConnection(args),
        rights: 'write'
      },
      setDatabase: {
        method: (args: { database: string }) => this.setDatabase(args.database),
        rights: 'write'
      },
      createDatabase: {
        method: (args: { database: string }) => this.createDatabase(args.database),
        rights: 'create'
      },
      deleteDatabase: {
        method: (args: { database: string }) => this.deleteDatabase(args.database),
        rights: 'write'
      },
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
      updateData: {
        method: (args: UpdateDataArgs) => this.updateData(args),
        rights: 'write'
      },
      loadDatabaseList: {
        method: () => this.loadDatabaseList(),
        rights: 'read'
      },
      loadAggrData: {
        method: (args: LoadAggrDataArgs) => this.loadAggrData(args),
        rights: 'read'
      },
      loadTableData: {
        method: (args: LoadTableDataArgs) => this.loadTableData(args),
        rights: 'read'
      },
      loadTableList: {
        method: () => this.loadTableList(),
        rights: 'read'
      },
      loadTableRowsNum: {
        method: (args: TableGuid) => this.loadTableRowsNum(args),
        rights: 'read'
      },
      loadTableGuid: {
        method: (args: LoadTableGuidArgs) => this.loadTableGuid(args),
        rights: 'read'
      },
      importTable: {
        method: (args: ImportTableArgs) => this.importTable(args),
        rights: 'write'
      }
    });
  }

  createDatabase(database: string): Promise<void> {
    return (
      this.getRemote().createDatabase(database)
      .then(() => {
        this.holder.save(true);
      })
    );
  }

  deleteDatabase(database: string): Promise<void> {
    const remote = this.getRemote();
    return (
      remote.deleteDatabase(database)
      .then(() => {
        if (remote.getDatabase() == database)
          remote.setDatabase('');
        this.holder.save(true);
      })
    );
  }

  importTable(args: ImportTableArgs): Promise<void> {
    let tableFile: TableFileBase;
    const { tableName, tableFileId } = args;
    return (
      this.holder.getObject<TableFileBase>(tableFileId)
      .then(table => {
        if (!(table instanceof TableFileBase))
          return Promise.reject(`Object is not valid`);

        tableFile = table;
        // drop table
        if (args.tableName) {
          return (
            this.deleteTable({ table: tableName })
            .then(() => tableName)
          );
        }

        // generate table name
        return (
          this.loadTableList()
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
        this.createTable({ table: tableName, columns })
        .then(() => {
          this.holder.save();
          return this.pushDataFromFile(tableFile, 20, tableName);
        });
      })
    );
  }

  private pushDataFromFile(fo: TableFileBase, rowsPerBunch: number, tableName: string): Promise<{ skipRows: number }> {
    if (!(fo instanceof TableFileBase))
      return Promise.reject('unknown type of source file');

    const result = { skipRows: 0 };
    const onRows = (args: OnRowsArgs) => {
      return (
        this.pushData({
          table: tableName,
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
      fo.getDataReading().readRows({
        onRows,
        linesPerBunch: rowsPerBunch
      })
      .then(() => {
        // need update version
        this.holder.save(true);
        this.invalidateGuids(tableName);
        this.setStatus('ok');
        return result;
      })
      .catch(e => {
        this.holder.save(true);
        this.addError(e.toString());
        this.setStatus('ok');
        return result;
      })
    );
  }

  loadTableList(): Promise<Array<TableDesc>> {
    if (this.tableList)
      return Promise.resolve(this.tableList);

    return (
      this.impl.loadTableList()
      .then(tableList => {
        return this.tableList = tableList;
      })
    );
  }

  loadTableRowsNum(args: TableGuid) {
    return (
      this.getGuidData(args.guid)
      .then(gd => {
        return this.impl.loadTableRowsNum({ table: gd.tmpTable });
      })
    );
  }

  loadTableData(args: LoadTableDataArgs): Promise<LoadTableDataResult> {
    const { from, count } = args;
    return (
      this.getGuidData(args.guid)
      .then(gd => {
        return (
          this.impl.loadTableData({ table: gd.tmpTable, from, count })
          .catch(e => {
            gd.invalid = true;
            return Promise.reject(e);
          })
        );
      })
    ).catch(e => {
      console.log(e);
      return (
        this.getGuidData(args.guid)
        .then(gd => this.impl.loadTableData({ table: gd.tmpTable, from, count }))
      );
    })
  }

  loadAggrData(args: LoadAggrDataArgs): Promise<LoadAggrDataResult> {
    return (
      this.getGuidData(args.guid)
      .then(gd => {
        return this.impl.loadAggrData({ table: gd.tmpTable, values: args.values });
      })
    );
  }

  loadDatabaseList() {
    return this.getRemote().loadDatabaseList();
  }

  deleteTable(args: DeleteTableArgs) {
    return (
      this.impl.deleteTable(args)
      .then(res => {
        this.tableList = null;
        this.invalidateGuids(args.table);
        this.holder.save(true);
        return res;
      })
    );
  }

  createTable(args: CreateTableArgs): Promise<TableDesc> {
    return (
      this.impl.createTable(args)
      .then(res => {
        this.tableList = null;
        this.holder.save(true);
        return res;
      })
    );
  }

  pushData(args: PushDataArgs): Promise<PushDataResult> {
    return (
      this.impl.pushData(args)
      .then(res => {
        this.invalidateGuids(args.table);
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
        this.invalidateGuids(args.table);
        this.holder.save(true);
        return res;
      })
    );
  }

  deleteData(args: DeleteDataArgs): Promise<void> {
    return (
      this.impl.deleteData(args)
      .then(() => {
        this.invalidateGuids(args.table);
      })
    );
  }

  setDatabase(database: string): Promise<boolean> {
    if (!this.getRemote().setDatabase(database))
      return Promise.resolve(false);

    this.holder.save(true);
    return Promise.resolve(false);
  }

  setConnection(args: IDArgs) {
    return (
      this.getRemote().setConnection(args)
      .then(() => {
        this.holder.save(true);
        return true;
      })
    );
  }

  createTableGuid(args: LoadTableGuidArgs, argsKey?: string): Promise<{ guid: string }> {
    argsKey = argsKey || getArgsKey(args);
    const { desc, ...other } = args;
    const id = this.tmpTableCounter++;
    const tmpTable = 'tmpt_' + id;
    const guid = 'guid_' + id;

    this.guidMap[guid] = {
      args: other,
      desc: { table: args.table, columns: [], rowsNum: 0 },
      tmpTable,
      invalid: true,
      createTask: null
    };
    this.argsToGuid[argsKey] = guid;

    return (
      this.createTempTableImpl({ guid })
      .then(res => {
        this.guidMap[guid].invalid = false;
        this.guidMap[guid].desc = {
          table: args.table,
          columns: res.columns,
          rowsNum: res.rowsNum
        };

        return { guid };
      })
    );
  }

  loadTableGuid(args: LoadTableGuidArgs): Promise<LoadTableGuidResult> {
    const argsKey = getArgsKey(args);
    const guid = this.argsToGuid[argsKey];
    let guidData = guid ? this.guidMap[guid] : null;

    let p: Promise<{ guid: string }> = Promise.resolve({ guid });
    if (!guidData)
      p = this.createTableGuid(args, argsKey);
    else if (guidData.invalid)
      p = this.createTempTableImpl({ guid })
      .then(res => {
        guidData.desc.rowsNum = res.rowsNum;
        guidData.desc.columns = res.columns;
        return { guid };
      });

    return (
      p.then(res => {
        if (!args.desc)
          return res;

        return {
          guid: res.guid,
          desc: this.guidMap[res.guid].desc
        };
      })
    );
  }

  protected createTempTableImpl(args: TableGuid): Promise<TableDescShort> {
    const data = this.guidMap[args.guid];
    if (!data)
      return Promise.reject(`guid="${args.guid}" not defined`);

    if (data.createTask)
      return data.createTask;

    return (
      data.createTask = this.impl.createTempTable({
        table: data.desc.table,
        tmpTableName: data.tmpTable,
        cond: data.args.cond,
        columns: data.args.columns,
        order: data.args.order,
        distinct: data.args.distinct
      })
      .then(res => {
        data.invalid = false;
        data.createTask = null;

        return res;
      }).catch(e => {
        data.invalid = false;
        data.createTask = null;

        return Promise.reject(e);
      })
    );
  }

  protected getGuidData(guid: string): Promise<GuidMapData> {
    const data = this.guidMap[guid];
    if (!data)
      return Promise.reject(`guid = ${guid} not found`);

    if (!data.invalid)
      return Promise.resolve(data);

    return (
      this.createTempTableImpl({ guid })
      .then(res => {
        data.desc.columns = res.columns;
        data.desc.rowsNum = res.rowsNum;

        return data;
      })
    );
  }

  invalidateGuids(table: string) {
    Object.keys(this.guidMap)
    .forEach(key => {
      const data = this.guidMap[key];
      if (data.desc.table != table || data.invalid)
        return;

      data.invalid = true;
    });
  }
}
