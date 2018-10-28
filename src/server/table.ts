import {
  Table as TableBase,
  ExecuteArgs,
  Columns,
  ColumnAttr,
  UpdateRowArgs,
  PushRowArgs,
  RemoveRowsArgs,
  SubtableAttrs,
  LoadCellsArgs,
  Condition,
  CompoundCond,
  ValueCond,
  NumStatsArgs,
  Cells,
  NumStats,
  LoadTableInfoArgs,
  PushCellsResult
} from '../client/table';
import { SERIALIZER } from 'objio';
import { FileObject } from './file-object';
import { TableArgs, CreateSubtableResult } from '../client/table';
import { TableFileObject, OnRowsArgs } from './table-file-object';
import { CSVFileObject } from './csv-file-object';

export function getCompSqlCondition(cond: CompoundCond, col?: string): string {
  let sql = '';
  if (cond.values.length == 1) {
    sql = getSqlCondition(cond.values[0]);
  } else {
    sql = cond.values.map(cond => {
      return `( ${getSqlCondition(cond)} )`;
    }).join(` ${cond.op} `);
  }

  if (cond.table && col)
    sql = `select ${col} from ${cond.table} where ${sql}`;

  return sql;
}

export function getSqlCondition(cond: Condition): string {
  const comp = cond as CompoundCond;

  if (comp.op && comp.values)
    return getCompSqlCondition(comp);

  const value = cond as ValueCond;

  if (Array.isArray(value.value) && value.value.length == 2) {
    return `${value.column} >= ${value.value[0]} and ${value.column} <= ${value.value[1]}`;
  } else if (typeof value.value == 'object') {
    const val = value.value as CompoundCond;
    return `${value.column} in (select ${value.column} from ${val.table} where ${getCompSqlCondition(val)})`;
  }

  const op = value.inverse ? '!=' : '=';
  return `${value.column}${op}"${value.value}"`;
}

function createIdColumn(cols: Array<ColumnAttr>, idColName?: string): ColumnAttr {
  let idCol: ColumnAttr;
  if (!idColName) { // create column
    idColName = idColName || 'row_uid';
    while (cols.find(col => col.name == idColName)) {
      idColName = 'row_uid_' + Math.round(Math.random() * 100000).toString(16);
    }
  } else {  //  find
    idCol = cols.find(col => col.name == idColName);
  }

  if (!idCol) {
    idCol = {
      name: idColName,
      type: 'INTEGER',
      autoInc: true,
      notNull: true,
      primary: true,
      unique: true
    };
    cols.splice(0, 0, idCol);
  }

  return idCol;
}

export interface ReadRowsResult {
  skipRows: number;
}

export class Table extends TableBase {
  constructor(args: TableArgs) {
    super(args);

    this.holder.setMethodsToInvoke({
      createSubtable: { method: (args: SubtableAttrs) =>     this.createSubtable(args), rights: 'write' },
      loadCells:      { method: (args: LoadCellsArgs) =>     this.loadCells(args),      rights: 'read'  },
      pushCells:      { method: (args: PushRowArgs) =>       this.pushCells(args),      rights: 'write' },
      updateCells:    { method: (args: UpdateRowArgs) =>     this.updateCells(args),    rights: 'write' },
      removeRows:     { method: (args: RemoveRowsArgs) =>    this.removeRows(args),     rights: 'write' },
      execute:        { method: (args: ExecuteArgs) =>       this.execute(args),        rights: 'write' },
      getNumStats:    { method: (args: NumStatsArgs) =>      this.getNumStats(args),    rights: 'read'  },
      loadTableInfo:  {
        method: (args: LoadTableInfoArgs, userId: string) => this.loadTableInfo(args, userId),
        rights: 'read'
      }
    });

    this.holder.addEventHandler({
      onLoad: () => {
        // not configured
        if (!this.table)
          return;

        this.progress = 0;
        this.status = 'ok';
        return (
          Promise.all([
            this.db.loadTableInfo({table: this.table}),
            this.db.loadRowsCount({table: this.table})
          ])
          .then(res => {
            this.columns = res[0];
            this.totalRowsNum = res[1];
          })
        );
      }
    });
  }

  private readRows(fo: TableFileObject, rowsPerBunch: number): Promise<ReadRowsResult> {
    if (!(fo instanceof TableFileObject))
      return Promise.reject('unknown type of source file');

    const result: ReadRowsResult = { skipRows: 0 };
    const onRows = (args: OnRowsArgs) => {
      return (
        this.pushCells({values: args.rows, updRowCounter: false})
        .then(res => {
          result.skipRows += args.rows.length - res.pushRows;
          this.setProgress(args.progress);
          this.totalRowsNum += args.rows.length;
        })
        .catch(e => {
          this.setStatus('error');
          this.addError(e.toString());
          return Promise.reject(e);
        })
      );
    };

    return (
      fo.readRows({
        file: fo.getPath(),
        onRows,
        linesPerBunch: rowsPerBunch
      })
      .then(() => {
        return result;
      })
    );
  }

  pushCells(args: PushRowArgs): Promise<PushCellsResult> {
    const result: PushCellsResult = {
      pushRows: args.values.length
    };

    const columns = this.columns.map(col => col.name);
    let task = (
      this.db.pushCells({ ...args, table: this.table, columns })
      .then(() => result)
    );
    task = task.catch(() => {
      let prom: Promise<any> = Promise.resolve();
      for (let n = 0; n < args.values.length; n++) {
        const pushArgs = { ...args, table: this.table, values: [ args.values[n] ], columns };
        prom = prom.then(() => {
          return (
            this.db.pushCells(pushArgs)
            .catch(() => {
              result.pushRows--;
              console.log(pushArgs.values);
              console.log('error at pushCells');
            })
          );
        });
      }
      return prom.then(() => result);
    });

    if (args.updRowCounter) {
      return (
        task.then(() => this.updateRowNum())
        .then(num => {
          result.totalRows = num;
          return result;
        })
      );
    }

    return task;
  }

  getNumStats(args: NumStatsArgs): Promise<NumStats> {
    return this.db.getNumStats({...args, table: args.table || this.table});
  }

  loadCells(args: LoadCellsArgs): Promise<Cells> {
    return this.db.loadCells({...args, table: args.table || this.table});
  }

  createSubtable(args: SubtableAttrs): Promise<CreateSubtableResult> {
    return this.db.createSubtable({ ...args, table: this.table });
  }

  loadTableInfo(args: LoadTableInfoArgs, userId?: string): Promise<{ columns: Columns, totalRows: number }> {
    const table = args.table;
    return (
      Promise.resolve()
      .then(() => {
        return (
          Promise.all([
            this.db.loadTableInfo({ table }),
            this.db.loadRowsCount({ table })
          ])
        );
      })
      .then(res => {
        return {
          columns: res[0],
          totalRows: res[1]
        };
      })
    );
  }

  execute(args: ExecuteArgs): Promise<any> {
    this.clearErrors();

    let startTime: number;
    let columns: Columns = [];
    let readRowCols: Columns = [];
    let idCol: ColumnAttr;

    let prepCols: Promise<Array<ColumnAttr>>;
    if (args.fileObjId) {
      prepCols = this.holder.getObject<TableFileObject>(args.fileObjId)
      .then(file => file.getColumns())
      .then(cols => {
        if (!args.columns || args.columns.length == 0)
          return cols;

        args.columns.forEach(argsCol => {
          const i = cols.findIndex(col => col.name == argsCol.name);
          if (i == -1)
            return;
          cols[i] = { ...cols[i], ...argsCol };
        });

        console.log('get columns', cols);
        return cols;
      });
    } else {
      prepCols = Promise.resolve( (args.columns || []).map(col => ({...col})) );
    }

    const task  = prepCols.then(cols => {
      // append idColumn if need
      readRowCols = cols.slice();
      columns = cols.filter(col => !col.discard);
      idCol = createIdColumn(columns, args.idColumn);
    })
    .then(() => this.db.deleteTable({table: args.table}))
    .then(() => {
      console.log('createTable', columns);
      return this.db.createTable({table: args.table, columns});
    })
    .then(() => {
      this.totalRowsNum = 0;
      this.columns = columns;
      this.table = args.table;
      this.idColumn = idCol.name;
      this.holder.save();
    });

    if (!args.fileObjId)
      return task;

    return task.then(() => {
      this.holder.getObject<TableFileObject>(args.fileObjId)
      .then(obj => {
        this.setStatus('in progress');
        this.holder.save();
        startTime = Date.now();
        return this.readRows(obj, 100);
      })
      .then(res => {
        console.log('skipped', res.skipRows);
        return this.updateRowNum();
      })
      .then(() => {
        this.fileObjId = args.fileObjId;
        this.lastExecuteTime = Date.now() - startTime;
        this.holder.save();
        this.setProgress(1);
        this.setStatus('ok');
      }).catch(err => {
        this.addError(err.toString());
      });
    });
  }

  private updateRowNum(): Promise<number> {
    return (
      this.db.loadRowsCount({table: this.table})
      .then(rows => {
        this.totalRowsNum = rows;
        this.holder.save();
        return rows;
      })
    );
  }

  static TYPE_ID = 'Table';
  static SERIALIZE: SERIALIZER = () => ({
    ...TableBase.SERIALIZE()
  })
}
