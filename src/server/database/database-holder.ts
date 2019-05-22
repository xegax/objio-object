import {
  GuidMapData,
  LoadTableGuidArgs,
  LoadAggrDataArgs,
  LoadTableGuidResult,
  LoadTableDataArgs,
  LoadAggrDataResult,
  TableGuid
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
import { DatabaseBase } from '../../base/database/database';

export {
  ColumnInfo,
  ColumnInfoFull
};

function getArgsKey(args: LoadTableGuidArgs): string {
  return [
    args.table,
    args.cond
  ].map(k => JSON.stringify(k)).join('-');
}

export class DatabaseHolder extends DatabaseHolderBase {
  protected impl: DatabaseBase;
  protected guidMap: {[guid: string]: GuidMapData} = {};
  protected argsToGuid: {[argsKey: string]: string} = {};

  protected tmpTableCounter = 0;

  constructor(args) {
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
      }
    });
  }

  loadTableList(): Promise<Array<TableDesc>> {
    return (
      this.impl.loadTableList()
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
    return (
      this.getGuidData(args.guid)
      .then(gd => {
        return this.impl.loadTableData({
          table: gd.tmpTable,
          from: args.from,
          count: args.count
        });
      })
    );
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
        this.invalidateGuids(args.table);
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

  setDatabase(database: string) {
    return (
      this.getRemote().setDatabase(database)
      .then(res => {
        this.holder.save(true);
        return res;
      })
    )
  }

  setConnection(args: IDArgs) {
    return (
      this.getRemote().setConnection(args)
      .then(res => {
        this.holder.save(true);
        return res;
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
      invalid: false,
      createTask: null
    };
    this.argsToGuid[argsKey] = guid;

    return (
      this.createTempTableImpl({ guid })
      .then(res => {
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
        cond: data.args.cond
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

  protected invalidateGuids(table: string) {
    Object.keys(this.guidMap)
    .forEach(key => {
      const data = this.guidMap[key];
      if (data.desc.table != table || data.invalid)
        return;

      data.invalid = true;
    });
  }
}
