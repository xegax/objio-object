import {
  TableDescArgs,
  TableRowsArgs,
  TableDescResult,
  TableRowsResult,
  ColumnStat,
  ExecuteArgs
} from '../../base/datasource/data-source';
import { JSONDataSourceBase } from '../../base/datasource/json-source';
import { FileSystemSimple } from 'objio/server';
import { UploadArgs } from 'objio';
import { TaskServerBase } from 'objio/server/task';
import { CPModules } from '../cp';
import { cpHost } from 'objio/server';
import { join } from 'path';

export class JSONDataSource extends JSONDataSourceBase {
  protected fs: FileSystemSimple;

  constructor(args?) {
    super(args);

    this.fs = new FileSystemSimple();
    const onInit = () => {
      this.fs.holder.addEventHandler({
        onUpload: this.onUploaded
      });
      return Promise.resolve();
    };

    this.holder.addEventHandler({
      onLoad: onInit,
      onCreate: onInit
    });
  }

  private onUploaded = (args: UploadArgs) => {
    this.holder.notify('uploaded');
  }

  execute(args: ExecuteArgs & { userId: string }) {
    this.totalRows = 0;
    this.totalCols = [];

    this.setProgress(0);
    this.setStatus('in progress');

    const task = new JSONSourceExecuteTask(this, args);
    return (
      this.holder.pushTask(task, args.userId)
      .then(() => {
        this.colsStat = task.getColsStat();
        this.totalCols = task.getCols();
        this.totalRows = task.getRows();
        this.executeTime = task.getTime();
        this.setStatus('ok');
        this.setProgress(0);
        this.holder.save(true);
        this.holder.delayedNotify({ type: 'ready' });
      })
    );
  }

  getTableDesc(args: TableDescArgs): Promise<TableDescResult> {
    return Promise.resolve({
      rows: this.totalRows,
      cols: this.totalCols.map(c => c.name)
    });
  }

  getTableRows(args: TableRowsArgs): Promise<TableRowsResult> {
    return (
      Promise.resolve({ startRow: 0, rows: [] })
    );
  }
}

export class JSONSourceExecuteTask extends TaskServerBase {
  private cols = Array<string>();
  private rows = 0;
  private args: ExecuteArgs;
  private src: JSONDataSource;
  private colsStat = new Map<string, ColumnStat>();
  private time: number;

  constructor(src: JSONDataSource, args: ExecuteArgs) {
    super();
    this.src = src;
    this.name = src.getName();
    this.args = args;
  }

  getRows() {
    return this.rows;
  }

  getCols() {
    return (
      this.cols.map(name => ({ name }))
      .filter(c => !this.args.genericCols.includes(c.name) )
    );
  }

  getColsStat() {
    return this.colsStat;
  }

  getTime() {
    return this.time;
  }

  protected runImpl(): Promise<{ task: Promise<void>; }> {
    const fs = this.src.getFS() as FileSystemSimple;

    this.desc = `Reading rows from ${this.src.getName()}`;
    const cp = cpHost<CPModules>()
    .run({
      module: 'json-source.js',
      path: join(__dirname, '../cp/'),
      options: { execArgv: [] }
    });

    cp.watch({
      progress: args => {
        this.name = `${this.src.getName()} (${args.rows})`;
        this.setProgress(args.p);
        this.src.setProgress(args.p);
        this.save();
      }
    });

    let time = Date.now();
    const jsonFile = fs.getPath('content');
    const dbFile = `source-${this.src.holder.getID()}.sqlite3`;
    (
      cp.get('readJSON', { file: jsonFile, colsCfg: this.args.columns, genCols: this.args.genericCols })
      .then(res => {
        this.cols = res.cols.map(col => col.name);
        this.rows = res.rows;
        return res.cols;
      })
      .then(cols => {
        cols.forEach(col => {
          this.colsStat.set(col.name, {
            name: col.name,
            empty: this.rows - col.defCount,
            count: this.rows,
            strMinMax: col.strCount ? [col.strMinSize, col.strMaxSize] : [],
            strCount: col.strCount,
            intCount: col.intCount,
            doubleCount: col.doubleCount,
            numMinMax: col.numCount ? [col.numMin, col.numMax] : []
          });
        });

        return cp.get('copyToDB', {
          jsonFile,
          db: this.holder.getPrivatePath(dbFile),
          table: this.args.table,
          cols,
          colsCfg: this.args.columns,
          genCols: this.args.genericCols
        });
      })
      .catch(e => {
        console.log('error occured', e);
      })
      .finally(() => {
        this.time = Date.now() - time;
        cp.exit();
      })
    );

    return Promise.resolve({ task: cp.promise });
  }

  protected stopImpl(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  protected pauseImpl(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  protected resumeImpl(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
