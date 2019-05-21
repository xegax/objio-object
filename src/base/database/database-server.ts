import { DatabaseBase2 } from './database-holder';
import {
  LoadTableGuidArgs,
  LoadTableGuidResult,
  TableDesc,
  TableDescShort
} from './database-holder-decl';

export interface GuidMapData {
  args: LoadTableGuidArgs;
  desc: TableDesc;
  tmpTable: string;
  invalid: boolean;
  createTask: Promise<TableDescShort>;
}

function getArgsKey(args: LoadTableGuidArgs): string {
  return [
    args.tableName,
    args.cond
  ].map(k => JSON.stringify(k)).join('-');
}

export interface TableModifyQueue {
}

export abstract class DatabaseServerBase extends DatabaseBase2 {
  protected guidMap: {[guid: string]: GuidMapData} = {};
  protected argsToGuid: {[argsKey: string]: string} = {};

  protected tmpTableCounter = 0;

  createTableGuid(args: LoadTableGuidArgs, argsKey?: string): Promise<{ guid: string }> {
    argsKey = argsKey || getArgsKey(args);
    const { desc, ...other } = args;
    const id = this.tmpTableCounter++;
    const tmpTable = 'tmpt_' + id;
    const guid = 'guid_' + id;

    this.guidMap[guid] = {
      args: other,
      desc: { tableName: args.tableName, columns: [], rowsNum: 0 },
      tmpTable,
      invalid: false,
      createTask: null
    };
    this.argsToGuid[argsKey] = guid;

    return (
      this.createTempTable({ guid })
      .then(res => {
        this.guidMap[guid].desc = {
          tableName: args.tableName,
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
      p = this.createTempTable({ guid })
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

  createTempTable(args: { guid: string }): Promise<TableDescShort> {
    const data = this.guidMap[args.guid];
    if (!data)
      return Promise.reject(`guid="${args.guid}" not defined`);

    if (data.createTask)
      return data.createTask;

    return (
      data.createTask = this.createTempTableImpl(data)
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
      this.createTempTable({ guid })
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
      if (data.desc.tableName != table || data.invalid)
        return;

      data.invalid = true;
    });
  }

  abstract createTempTableImpl(guidData: GuidMapData): Promise<TableDescShort>;
}
