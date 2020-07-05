import {
  GuidMapData,
  LoadTableGuidArgs,
  LoadAggrDataArgs,
  LoadTableGuidResult,
  LoadTableDataArgs,
  LoadAggrDataResult,
  TableGuid,
  ImportTableArgs,
  TableState
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
import { IDArgs, StrMap } from '../../common/interfaces';
import { DataSourceHolder } from '../../server/datasource/data-source-holder';
import { prepareAll, randomId } from '../../common/common';

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

interface PushDataFromDatasourceArgs {
  datasource: DataSourceHolder;
  rowsCount: number;
  tableName: string;
  columns: Array<string>;
}

export class DatabaseHolder extends DatabaseHolderBase {
  protected guidMap: {[guid: string]: GuidMapData} = {};
  protected argsToGuid: {[argsKey: string]: string} = {};
  protected tableList: Array<TableDesc> = null;
  protected tableImportInProgress = new Set();

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

  private updateTableState(table: string, state: Partial<TableState>) {
    this.tableStateMap[table] = {
      ...this.tableStateMap[table],
      ...state
    };
  }

  private updateTableVersion(table: string) {
    const v = randomId();
    this.updateTableState(table, { v });
    console.log(`table (${table}) version`, v);
  }

  private setTableLocked(table: string, locked: boolean) {
    this.updateTableState(table, { locked });
    console.log(`table (${table}) locked`, locked);
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
    const { dataSourceId, tableName } = args;
    if (!tableName)
      return Promise.reject('tableName not defined');

    if (this.tableImportInProgress.has(tableName))
      return Promise.reject(`table (${tableName}) already in progress`);

    return (
      this.holder.getObject<DataSourceHolder>(dataSourceId)
      .then(datasource => {
        if (!(datasource instanceof DataSourceHolder))
          return Promise.reject(`datasource must be instance of DataSourceHolder`);

        return (
          prepareAll<{ datasource: DataSourceHolder }>({
            datasource,
            delete: args.replaceExists ? this.deleteTable({ table: tableName }) : false
          })
        );
      })
      .then(res => {
        const columns = res.datasource.getColumns().map(col => {
          let colType = col.dataType;
          if (colType == 'VARCHAR' && col.size != null)
            colType =  `${col.dataType}(${col.size})`;

          return {
            colName: col.rename || col.name,
            colType: colType || 'VARCHAR'
          };
        });

        // start to push data from file
        return (
          prepareAll<{ datasource: DataSourceHolder }>({
            ...res,
            create: this.createTable({ table: tableName, columns })
          })
        );
      }).then(res => {
        const { datasource } = res;
        const columns = datasource.getColumns().map(c => c.rename || c.name);
        this.holder.save();
        this.pushDataFromDatasource({ datasource, tableName, rowsCount: 20, columns });
      })
    );
  }

  private pushDataFromDatasource(args: PushDataFromDatasourceArgs): Promise<{ skipRows: number}> {
    const { datasource, rowsCount, columns, tableName } = args;
    if (!(datasource instanceof DataSourceHolder))
      return Promise.reject('source must be DataSourceHolder instance');

    this.setStatus('in progress');
    this.tableImportInProgress.add(tableName);
    this.setTableLocked(tableName, true);

    const result = { skipRows: 0 };
    let startRow = 0;
    let totalRows = datasource.getTotalRows();
    let rowsCounter = 0;
    const nextRows = (resolve: () => void, reject: (err: Error) => void) => {
      datasource.getTableRows({ startRow, rowsCount })
      .then(res => {
        startRow += res.rows.length;
        const rows: Array<StrMap> = res.rows.map(row => {
          let rowObj = {};
          columns.forEach((c, i) => {
            rowObj[c] = row[i] != null ? '' + row[i] : null;
          });
          return rowObj;
        });
        return rows;
      })
      .then(rows => {
        if (rows.length == 0)
          return resolve();

        rowsCounter += rows.length;
        return (
          this.pushData({
            table: tableName,
            rows,
            updateVersion: false
          })
          .then(res => {
            result.skipRows += rows.length - res.pushRows;
            this.setProgress(startRow / totalRows);
            nextRows(resolve, reject);
          })
        );
      })
      .catch(e => {
        reject(e);
        return Promise.reject(e);
      });
    };

    let p = new Promise<{ skipRows: number }>((resolve, rejects) => nextRows(resolve, rejects));
    p = p.then(() => {
      this.tableImportInProgress.delete(tableName);
      this.setTableLocked(tableName, false);
      this.updateTableVersion(tableName);
      // need update version
      this.holder.save(true);
      this.invalidateGuids(tableName);
      this.setStatus('ok');
      console.log('pushed', rowsCounter);
      return result;
    }).catch(e => {
      this.setTableLocked(tableName, false);
      this.updateTableVersion(tableName);
      this.tableImportInProgress.delete(tableName);
      this.holder.save(true);
      this.addError(e.toString());
      this.setStatus('ok');
      return result;
    });

    return p;
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

  private pushDataImpl(args: PushDataArgs): Promise<PushDataResult> {
    let p: Promise<void> = Promise.resolve();
    const rows: PushDataResult = {
      pushRows: 0
    };

    const flush = (values: Array<StrMap>) => {
      if (values.length == 0)
        return;

      return (
        p = p.then(() => this.impl.pushData({ ...args, rows: values }))
        .then(() => {
          rows.pushRows += values.length;
        })
        .catch(e => {
          console.log(e);
        })
      );
    };

    const props = this.impl.getDBProps();
    let buf = Array<StrMap>();
    let vals = 0;
    args.rows.forEach(r => {
      const colsOnRow = Object.keys(r).length;

      if (vals + colsOnRow >= props.valuesPerQuery) {
        flush(buf);
        buf = [r];
        vals = colsOnRow;
      } else {
        vals += colsOnRow;
        buf.push(r);
      }
    });
    flush(buf);

    return (
      p.then(() => rows)
    );
  }

  pushData(args: PushDataArgs): Promise<PushDataResult> {
    return (
      this.pushDataImpl(args)
      .then(res => {
        if (args.updateVersion != false) {
          this.invalidateGuids(args.table);
          this.holder.save(true);
        }
        return res;
      })
      .catch(() => {
        let pushRows = 0;
        let p = Promise.resolve();
        for (let r of args.rows) {
          p = p.then(() => this.impl.pushData({ ...args, rows: [ r ] }))
          .then(() => {
            pushRows += 1;
          })
          .catch(() => {});
        }

        return p.then(() => ({ pushRows }));
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
