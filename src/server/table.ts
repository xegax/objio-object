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
  LoadTableInfoArgs
} from '../client/table';
import { SERIALIZER, EXTEND } from 'objio';
import { CSVReader, CSVBunch } from 'objio/server';
import { FileObject } from './file-object';
import { TableArgs, CreateSubtableResult } from '../client/table';
import { CSVFileObject } from './csv-file-object';
import { JSONFileObject } from './json-file-object';
import { JSONReader, JSONBunch } from 'objio/common/json-reader';
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

  private readCSVColumns(csv: CSVFileObject): Promise<Array<ColumnAttr>> {
    let cols: Array<ColumnAttr>;

    const onNextBunch = (bunch: CSVBunch) => {
      cols = bunch.rows[0].map(col => ({
        name: col,
        type: 'TEXT'
      }));
      bunch.done();
    };

    return ( 
      CSVReader.read({file: csv.getPath(), onNextBunch, linesPerBunch: 1})
      .then(() => cols)
    );
  }

  private readJSONColumns(json: JSONFileObject): Promise<Array<ColumnAttr>> {
    let cols: Array<ColumnAttr>;

    const onNextBunch = (bunch: JSONBunch) => {
      const row = bunch.rows[0];
      cols = Object.keys(row).map(col => ({
        name: col,
        type: 'TEXT'
      }));
      bunch.done();
    };

    return ( 
      JSONReader.read({file: json.getPath(), onNextBunch, linesPerBunch: 5})
      .then(() => cols)
    );
  }

  private readColumns(fo: FileObject): Promise<Array<ColumnAttr>> {
    if (fo instanceof CSVFileObject)
      return this.readCSVColumns(fo);
    else if (fo instanceof JSONFileObject)
      return this.readJSONColumns(fo);
    return Promise.reject('unknown type of source file')
  }

  private readRows(csv: FileObject, columns: Columns, startRow: number, flushPerRows: number): Promise<any> {
    if (csv instanceof CSVFileObject)
      return this.readRowsCSV(csv, columns, startRow, flushPerRows);
    else if (csv instanceof JSONFileObject)
      return this.readRowsJSON(csv, columns, startRow, flushPerRows);
    return Promise.reject('unknown type of source file');
  }

  private readRowsJSON(json: JSONFileObject, columns: Columns, startRow: number, flushPerRows: number): Promise<any> {
    const onNextBunch = (bunch: JSONBunch) => {
      const rows = bunch.firstLineIdx == 0 ? bunch.rows.slice(1) : bunch.rows;
      const values: {[col: string]: Array<string>} = {};

      rows.forEach(row => {
        Object.keys(row).forEach(key => {
          let v = (row[key] != null ? row[key] : '').trim();

          const colAttr = columns.find(c => c.name == key);
          if (colAttr.discard)
            return;

          const col = values[colAttr.name] || (values[colAttr.name] = []);
          if (colAttr.removeQuotes != false) {
            if (v.length > 1 && v[0] == '"' && v[v.length - 1] == '"')
              v = v.substr(1, v.length - 2);
          }
          col.push(v);
        });
      });

      return this.pushCells({values, updRowCounter: false}).then(() => {
        this.setProgress(bunch.progress);
        this.totalRowsNum += rows.length;
      });
    };

    return (
      JSONReader.read({file: json.getPath(), onNextBunch})
    );
  }

  private readRowsCSV(csv: FileObject, columns: Columns, startRow: number, flushPerRows: number): Promise<any> {
    const onNextBunch = (bunch: CSVBunch) => {
      const rows = bunch.firstLineIdx == 0 ? bunch.rows.slice(1) : bunch.rows;
      const values: {[col: string]: Array<string>} = {};

      rows.forEach(row => {
        row.forEach((v, i) => {
          v = v.trim();

          const colAttr = columns[i];
          if (colAttr.discard)
            return;

          const col = values[colAttr.name] || (values[colAttr.name] = []);
          if (colAttr.removeQuotes != false) {
            if (v.length > 1 && v[0] == '"' && v[v.length - 1] == '"')
              v = v.substr(1, v.length - 2);
          }
          col.push(v);
        });
      });

      return this.pushCells({values, updRowCounter: false}).then(() => {
        this.setProgress(bunch.progress);
        this.totalRowsNum += rows.length;
      });
    };

    return (
      CSVReader.read({file: csv.getPath(), onNextBunch})
    );
  }

  pushCells(args: PushRowArgs): Promise<number> {
    let task = this.db.pushCells({ ...args, table: this.table });
    if (!args.updRowCounter)
      return task;

    return task.then(() => this.updateRowNum());
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
    let startTime: number;
    let columns: Columns = [];
    let readRowCols: Columns = [];
    let idCol: ColumnAttr;

    let prepCols: Promise<Array<ColumnAttr>>;
    if (args.fileObjId) {
      prepCols = this.holder.getObject<FileObject>(args.fileObjId)
      .then(csv => this.readColumns(csv))
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
      this.holder.getObject<FileObject>(args.fileObjId)
      .then(obj => {
        this.setStatus('in progress');
        this.holder.save();
        startTime = Date.now();
        return this.readRows(obj, readRowCols, 1, 50);
      })
      .then(() => this.updateRowNum())
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
