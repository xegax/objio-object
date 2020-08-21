import {
  DataSourceHolderBase,
  TableDescArgs,
  TableRowsArgs,
  TableDescResult,
  TableRowsResult,
  RenameColArgs,
  AddGenericArgs
} from '../../base/datasource/data-source-holder';
import { ApprMapBase } from '../../base/appr-map';
import { DataSourceProfile, DataSourceCol, ColumnCfg } from '../../base/datasource/data-source-profile';
import { SQLite } from '../sqlite';
import { IEval, compileEval } from '../../base/datasource/eval';
import { ViewArgs, RowsArgs, RowsResult, ViewResult, ArrCell } from 'ts-react-ui/grid/grid-requestor-decl';
import { clone } from 'ts-react-ui/common/common';

interface ProfileCache {
  apprVer: string;
  srcVer: string;
  columnMap: Array<number>;
  columns: Array<DataSourceCol & { name: string }>;
  profile: ApprMapBase<DataSourceProfile>;
}

interface ViewData {
  args: ViewArgs;
  rows: number;
  columns: Array<string>;
}

export class DataSourceHolder extends DataSourceHolderBase {
  private profilesCtx: {[profId: string]: ProfileCache} = {};
  private db?: SQLite;
  private evalMap = new Map<string, IEval>();
  private viewIds = new Map<string, ViewData>();
  protected viewIdCounter = 0;

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
      },
      addGenericCol: {
        method: (args: AddGenericArgs) => this.addGenericCol(args),
        rights: 'write'
      },
      removeGenericCol: {
        method: (args: { name: string }) => this.removeGenericCol(args.name),
        rights: 'write'
      },
      execute: {
        method: () => this.execute(),
        rights: 'write'
      },
      createView: {
        method: (args: ViewArgs) => this.createView(args),
        rights: 'read'
      },
      getRows: {
        method: (args: RowsArgs) => this.getRows(args),
        rights: 'read'
      },
      clearCache: {
        method: () => this.clearCache(),
        rights: 'read'
      }
    });

    const onInit = (load: boolean, userId?: string) => {
      this.getProfile().holder.addEventHandler({
        onObjChange: () => {
          this.evalMap.clear();
        }
      });

      this.dataSource.holder.subscribe(this.onDataSourceUpdated, 'ready');
      this.dataSource.holder.subscribe(this.onUploaded, 'uploaded');

      return (
        SQLite.open(this.holder.getPrivatePath(`source-${this.dataSource.getID()}.sqlite3`))
        .then(db => {
          this.db = db;
        })
      );
    };

    this.holder.addEventHandler({
      onLoad: () => onInit(true),
      onCreate: (userId: string) => onInit(false, userId)
    });
  }

  private onDataSourceUpdated = () => {
    this.statMap = {};
    let columns: ColumnCfg = {};
    Array.from(this.dataSource.getColsStat().values())
    .forEach(col => {
      this.statMap[col.name] = {...col};
    });

    this.db.fetchTableInfo({ table: DataSourceHolder.SOURCE_TABLE })
    .then(cols => {
      cols.forEach(col => {
        columns[col.name] = {
          dataType: col.type.toUpperCase()
        };
      });
      this.updateProfile({ columns });
      this.holder.save(true);
    });
  }

  private onUploaded = () => {
    this.execute();
  }

  protected findViewId(args: ViewArgs) {
    const s1 = JSON.stringify(args);

    return Array.from(this.viewIds.keys()).find(view => {
      return JSON.stringify(this.viewIds.get(view)?.args) == s1;
    });
  }

  execute() {
    if (this.dataSource.getStatus() == 'in progress')
      throw 'Object in progress';

    this.dataSource.execute({
      table: DataSourceHolder.SOURCE_TABLE,
      columns: this.getProfile().get().columns,
      genericCols: this.genericCols
    });

    return Promise.resolve();
  }

  private getContext(profileId?: string): ProfileCache {
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

    const cols = [
      ...this.dataSource.getTotalCols().map(c => c.name),
      ...this.genericCols
    ];
    ctx.columnMap = ctx.columns.map(c => {
      return cols.indexOf(c.name);
    });

    return ctx;
  }

  addGenericCol(args: AddGenericArgs) {
    if (this.genericCols.includes(args.column))
      return Promise.reject(`Column "${args.column}" already exists`);

    this.genericCols.push(args.column);
    if (args.cfg)
      this.updateProfile({ columns: {[args.column]: args.cfg} });
    this.holder.save();

    return Promise.resolve();
  }

  removeGenericCol(name: string) {
    const idx = this.genericCols.indexOf(name);
    if (idx != -1) {
      this.genericCols.splice(idx, 1);
      this.updateProfile({ columns: {[name]: null} });
      this.holder.save();
    }

    return Promise.resolve();
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
      this.db.getRows({ table: DataSourceHolder.SOURCE_TABLE, from: startRow, count: rowsCount })
      .then(rows => {
        const cols = this.getColumns({ filter: false, sort: false }).map(c => c.name);
        const genCols = new Set(this.genericCols);
        const arrRows = rows.map((row, r) => {
          return ctx.columnMap.map(i => {
            const col = cols[i];
            if (genCols.has(col)) {
              let colEval = this.evalMap.get(col);
              if (!colEval) {
                this.evalMap.set(col, colEval = compileEval({
                  expr: {...ctx.profile.get().columns[col]}.expression || ''
                }));
              }
              row[col] = colEval.format({ recNo: startRow + r, row });
            }

            return row[ col ];
          });
        });

        return { rows: arrRows, startRow: args.rowsCount };
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

  createView(args: ViewArgs): Promise<ViewResult> {
    args = clone(args);
    delete args.columns;

    let viewId = this.findViewId(args);
    console.log(viewId);
    let task = Promise.resolve();

    let viewData: ViewData | undefined;
    if (!viewId) {
      viewId = 'v_' + this.viewIdCounter++;
      viewData = { args: clone(args), rows: 0, columns: [] };
      this.viewIds.set(viewId, viewData);

      if (args.aggregate) {
        return this.db.createAggr({
          table: args.viewId || DataSourceHolder.SOURCE_TABLE,
          view: viewId,
          cols: args.aggregate.columns
        }).then(() => {
          viewData.rows = args.aggregate.columns.length;
          viewData.columns = ['name', 'min', 'max', 'sum'];
          return {
            viewId,
            desc: {
              columns: viewData.columns,
              rows: viewData.rows
            }
          };
        });
      } else if (args.distinct) {
        return (
          this.db.createDistinct({
            table: args.viewId || DataSourceHolder.SOURCE_TABLE,
            view: viewId,
            col: args.distinct.column,
            sort: args.sorting?.cols
          }).then(rows => {
            viewData.rows = rows;
            viewData.columns = ['value', 'count'];
            return {
              viewId,
              desc: {
                columns: viewData.columns,
                rows
              }
            };
          })
        );
      }

      task = this.db.createView({
        table: args.viewId || DataSourceHolder.SOURCE_TABLE,
        view: viewId,
        sort: args.sorting?.cols,
        filter: args.filter
      })
      .then(() => this.db.getRows({ table: viewId, from: 0, count: 1, cols: ['count(*) as count'] }))
      .then(rows => {
        viewData.rows = rows[0]['count'];
        viewData.columns = this.getColumns().map(c => c.name);
      });
    } else {
      viewData = this.viewIds.get(viewId);
    }

    const savedCols = viewData.args.distinct != null || viewData.args.aggregate != null;
    return task.then(() => ({
      viewId,
      desc: {
        columns: savedCols ? viewData.columns : this.getColumns().map(c => c.name),
        rows: viewData.rows
      }
    }));
  }

  private getCustomColRows(args: RowsArgs, cols: Array<string>): Promise<RowsResult<ArrCell>> {
    const vargs = this.viewIds.get(args.viewId);
    const totalRows = vargs.rows;
    const startRow = Math.max(args.from, 0);
    const rowsCount = Math.min(startRow + args.count, totalRows) - startRow;
    if (rowsCount == 0)
      return Promise.resolve({ rows: [], startRow });

    return (
      this.db.getRows({ table: args.viewId, from: startRow, count: rowsCount })
      .then(rows => {
        return {
          rows: rows.map(r => {
            return cols.map(c => r[c]);
          })
        };
      })
    );
  }

  getRows(args: RowsArgs): Promise<RowsResult<ArrCell>> {
    const totalRows = this.dataSource.getTotalRows();
    const startRow = Math.max(args.from, 0);
    const rowsCount = Math.min(startRow + args.count, totalRows) - startRow;
    if (rowsCount == 0)
      return Promise.resolve({ rows: [], startRow });

    const vargs = this.viewIds.get(args.viewId);
    if (vargs.args.distinct)
      return this.getCustomColRows(args, ['value', 'count']);

    if (vargs.args.aggregate)
      return this.getCustomColRows(args, ['name', 'min', 'max', 'sum']);

    const ctx = this.getContext();
    return (
      this.db.getRows({ table: args.viewId, from: startRow, count: rowsCount })
      .then(rows => {
        const cols = this.getColumns({ filter: false, sort: false }).map(c => c.name);
        const genCols = new Set(this.genericCols);
        const arrRows = rows.map((row, r) => {
          return ctx.columnMap.map(i => {
            const col = cols[i];
            if (genCols.has(col)) {
              let colEval = this.evalMap.get(col);
              if (!colEval) {
                this.evalMap.set(col, colEval = compileEval({
                  expr: {...ctx.profile.get().columns[col]}.expression || ''
                }));
              }
              row[col] = colEval.format({ recNo: startRow + r, row });
            }

            return row[ col ];
          });
        });

        return { rows: arrRows };
      })
    );
  }

  clearCache() {
    this.viewIdCounter = 0;
    let task = Promise.resolve();
    Array.from(this.viewIds.keys()).forEach(key => {
      task = task.then(() => this.db.deleteTable(key));
    });

    this.viewIds.clear();
    return task;
  }
}
