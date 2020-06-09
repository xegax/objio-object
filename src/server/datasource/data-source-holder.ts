import {
  DataSourceHolderBase,
  TableDescArgs,
  TableRowsArgs,
  TableDescResult,
  TableRowsResult,
  RenameColArgs,
  ColumnStat
} from '../../base/datasource/data-source-holder';
import { ApprMapBase } from '../../base/appr-map';
import { DataSourceProfile, DataSourceCol } from '../../base/datasource/data-source-profile';
import { TaskServerBase } from 'objio/server/task';
import { DataSourceBase } from '../../base/datasource/data-source';

interface ProfileCache {
  apprVer: string;
  srcVer: string;
  columnMap: Array<number>;
  columns: Array<DataSourceCol & { name: string }>;
  profile: ApprMapBase<DataSourceProfile>;
}

function updateStat(stat: ColumnStat, data: any) {
  const empty = data == null || data == '';
  if (empty)
    stat.empty++;

  if (typeof data == 'string' && data.length > 0) {
    stat.strMinMax = !stat.strMinMax.length ? [data.length, data.length] : [
      Math.min(stat.strMinMax[0], data.length),
      Math.max(stat.strMinMax[1], data.length)
    ];
    stat.strCount++;
  }

  let num = +data;
  if (!empty && !Number.isNaN(num) && Number.isFinite(num)) {
    stat.numMinMax = !stat.numMinMax.length ? [
      num,
      num
    ] : [
      Math.min(num, stat.numMinMax[0]),
      Math.max(num, stat.numMinMax[1])
    ];

    if (Number.isInteger(num))
      stat.intCount++;
    else
      stat.doubleCount++;
  }
  stat.count++;
}

export class DataSourceHolder extends DataSourceHolderBase {
  private profilesCtx: {[profId: string]: ProfileCache} = {};

  constructor(args?) {
    super(args);

    this.holder.setMethodsToInvoke({
      getTableDesc: {
        method: (args: TableDescArgs) => this.getTableDesc(args),
        rights: 'read'
      },
      getTableRows: {
        method: (args: TableRowsArgs) => this.getTableRows(args),
        rights: 'read'
      },
      renameColumn: {
        method: (args: RenameColArgs) => this.renameColumn(args),
        rights: 'write'
      }
    });

    const onInit = (load: boolean, userId?: string) => {
      this.dataSource.holder.subscribe(() => this.updateStatistics(userId), 'ready');
      return Promise.resolve();
    };

    this.holder.addEventHandler({
      onLoad: () => onInit(true),
      onCreate: (userId: string) => onInit(false, userId)
    });
  }

  private updateStatistics = (userId: string) => {
    const task = new UpdateStatTask(this.dataSource);
    this.holder.pushTask(task, userId)
    .then(() => {
      this.statMap = task.getStat();
      this.getProfile().setProps(task.getProfile());
      this.holder.save(true);
    });
  }

  private getContext(profileId: string): ProfileCache {
    const arr = this.profiles.getArray();
    const p = arr.find(p => p.holder.getID() == profileId) || arr[0];
    const apprv = p.holder.getVersion();
    const srcv = this.dataSource.getVersion();
    const id = p.holder.getID();
    let ctx = this.profilesCtx[id];
    if (ctx && ctx.apprVer == apprv && ctx.srcVer == srcv)
      return ctx;

    ctx = this.profilesCtx[id] = {
      apprVer: apprv,
      srcVer: srcv,
      columnMap: [],
      profile: p,
      columns: this.getColumns({ profile: p })
    };

    const totalCols = this.dataSource.getTotalCols();
    ctx.columnMap = ctx.columns.map(c => {
      return totalCols.findIndex(tc => tc.name == c.name);
    });

    return ctx;
  }

  getTableDesc(args: TableDescArgs): Promise<TableDescResult> {
    const ctx = this.getContext(args.profile);
    return Promise.resolve({
      rows: this.dataSource.getTotalRows(),
      cols: ctx.columns.map(c => c.name)
    });
  }

  getTableRows(args: TableRowsArgs): Promise<TableRowsResult> {
    const totalRows = this.dataSource.getTotalRows();
    const startRow = Math.max(args.startRow, 0);
    const rowsCount = Math.min(startRow + args.rowsCount, totalRows) - startRow;
    if (rowsCount == 0)
      return Promise.resolve({ rows: [], startRow });

    const ctx = this.getContext(args.profile);
    return (
      this.dataSource.getTableRows({ startRow, rowsCount })
      .then(res => {
        const rows = res.rows.map(cell => {
          return ctx.columnMap.map(i => cell[i]);
        });

        return { rows, startRow: args.rowsCount };
      })
    );
  }

  renameColumn(args: RenameColArgs): Promise<void> {
    const cols = this.getColumns().filter(c => c.name != args.column);
    if (cols.some(c => (c.rename || c.name) == args.newName))
      return Promise.reject(`Column name "${args.newName}" already exists`);

    this.getProfile().setProps({ columns: {[args.column]: { rename: args.newName }} });
    return Promise.resolve();
  }
}

class UpdateStatTask extends TaskServerBase {
  private dataSource: DataSourceBase;
  private statMap: {[col: string]: ColumnStat} = {};
  private profile: Partial<DataSourceProfile> = {};

  constructor(src: DataSourceBase) {
    super();
    this.dataSource = src;
    this.name = src.getName();
  }

  protected runImpl(): Promise<{ task: Promise<void>; }> {
    const cols = this.dataSource.getTotalCols();
    cols.forEach(c => {
      this.statMap[c.name] = {
        empty: 0,
        count: 0,
        numMinMax: [],
        strMinMax: [],
        strCount: 0,
        intCount: 0,
        doubleCount: 0
      };
    });

    const totalRows = this.dataSource.getTotalRows();
    let startRow = 0;
    const nextRows = () => {
      const rowsCount = Math.min(startRow + 50, totalRows) - startRow;
      if (rowsCount == 0) {
        this.dataSource.setProgress(1);
        this.dataSource.setStatus('ok');
        this.save();
        return;
      }

      return (
        this.dataSource.getTableRows({ startRow, rowsCount })
        .then(res => {
          res.rows.forEach(row => {
            row.forEach((v, c) => updateStat(this.statMap[cols[c].name], v));
          });

          startRow += res.rows.length;
          this.dataSource.setProgress(startRow / totalRows);
          this.setProgress(startRow / totalRows);
          this.name = `${this.dataSource.getName()}, stat (${startRow})`;
          this.save();
          return nextRows();
        })
      );
    }

    this.dataSource.setProgress(0);
    this.dataSource.setStatus('in progress');
    this.dataSource.holder.save(true);
    const task = (
      nextRows()
      .then(this.updateColumnTypes)
    );

    return Promise.resolve({
      task
    });
  }

  private updateColumnTypes = () => {
    const cols = this.dataSource.getTotalCols();
    let newProps: Partial<DataSourceProfile> = { columns: {} };
    cols.forEach(col => {
      const stat = this.statMap[col.name];
      const isNum = stat.intCount + stat.doubleCount + stat.empty == stat.count;
      const isInt = stat.intCount + stat.empty == stat.count;
      const isStr = !isNum;
      const size = stat.strMinMax[1];
      const isText = isStr && size > 65535;
      if (isNum) {
        newProps.columns[col.name] = { type: isInt ? 'INTEGER' : 'REAL', size };
      } else if (isStr) {
        newProps.columns[col.name] = { type: isText ? 'TEXT' : 'VARCHAR', size };
      }
    });
    this.profile = newProps;
    this.save();
  }

  getProfile() {
    return this.profile;
  }

  getStat() {
    return this.statMap;
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
