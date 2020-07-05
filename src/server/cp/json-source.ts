import { cpChild } from 'objio/server';
import { readJSONArray } from 'objio/common/reader/json-array-reader';
import { SQLite } from '../sqlite';
import { ColumnCfg } from '../../base/datasource/data-source-profile';
import { modifyRows } from '../datasource/modify-rows';

export interface ReadResult {
  cols: Array<Column>;
  rows: number;
}

export interface JSONHandler {
  readJSON(args: {
    file: string;
    colsCfg: ColumnCfg;
    genCols: Array<string>;
  }): Promise<ReadResult>;
  copyToDB(args: {
    db: string;
    table: string;
    cols: Array<Column>;
    colsCfg: ColumnCfg;
    jsonFile: string;
    genCols: Array<string>;
  }): Promise<void>;
  exit(): void;
}

export interface JSONWatch {
  progress?(args: { rows: number; p: number }): void;
}

let rowsCount = 0;
let cols = new Map<string, Column>();

const cp = cpChild<JSONWatch, JSONHandler>({
  readJSON: async ({ file, colsCfg, genCols }) => {
    rowsCount = 0;
    cols.clear();
    let p = 0;

    let rowsModifier = modifyRows(colsCfg, genCols);
    await readJSONArray({
      file,
      onBunch: bunch => {
        let rows = rowsModifier.modify({ rows: bunch.items.map(item => item.obj) });
        for (let n = 0; n < rows.length; n++) {
          const row = rows[n];
          const keys = Object.keys(row);
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            let col = cols.get(key);
            if (!col) {
              col = {
                name: key,
                nullCount: 0,
                strCount: 0,
                numCount: 0,
                intCount: 0,
                doubleCount: 0
              };
              cols.set(key, col);
            }
            updateStat(col, row[key]);
          }
        }
        rowsCount += rows.length;

        if (bunch.progress - p >= 0.05 || bunch.progress == 1) {
          p = bunch.progress;
          cp.invoke('progress', { rows: rowsCount, p });
        }
      }
    });

    return {
      rows: rowsCount,
      cols: Array.from(cols.values())
    };
  },
  copyToDB: async (args) => {
    const db = await SQLite.open(args.db);
    await db.deleteTable(args.table);
    await db.createTable({ table: args.table, columns: args.cols.map(getSQLType) });
    const colsArr = args.cols.map(col => col.name);
    const itemsPerBunch = Math.floor(999 / colsArr.length);

    rowsCount = 0;
    let p = 0;
    const rowsModifier = modifyRows(args.colsCfg, args.genCols);
    await db.exec('BEGIN TRANSACTION');
    await readJSONArray({
      itemsPerBunch,
      file: args.jsonFile,
      onBunch: bunch => {
        return db.insert({
          table: args.table,
          values: rowsModifier.modify({ rows: bunch.items.map(item => item.obj) }) as any,
          cols: colsArr
        }).then(() => {
          rowsCount += bunch.items.length;
          if (bunch.progress - p >= 0.05 || bunch.progress == 1) {
            cp.invoke('progress', { rows: rowsCount, p: bunch.progress });
          }
        });
      }
    });
    await db.exec('END TRANSACTION');
    await db.close();
  },
  exit: () => process.exit()
});

interface Column {
  name: string;
  nullCount: number;

  strMinSize?: number;
  strMaxSize?: number;
  strCount: number;

  numCount: number; // intCount + doubleCount
  intCount: number;
  doubleCount: number;
  numMin?: number;
  numMax?: number;
}

function getSQLType(col: Column): { name: string; type: string; } {
  if (col.strCount) {
    return {
      name: col.name,
      type: 'VARCHAR'
    };
  }

  if (col.doubleCount) {
    return {
      name: col.name,
      type: 'REAL'
    };
  }

  if (col.intCount) {
    return {
      name: col.name,
      type: 'INTEGER'
    };
  }
}

function updateStat(col: Column, value: any) {
  if (typeof value == 'number') {
    col.numCount++;
    if (Math.floor(value) == value)
      col.intCount++;
    else
      col.doubleCount++;
    col.numMin = col.numMin == null ? value : Math.min(value, col.numMin);
    col.numMax = col.numMax == null ? value : Math.max(value, col.numMax);
  } else if (typeof value == 'string') {
    const len = value.length;
    col.strMinSize = col.strMinSize == null ? len : Math.min(len, col.strMinSize);
    col.strMaxSize = col.strMaxSize == null ? len : Math.max(len, col.strMaxSize);
    col.strCount++;
  } else if (value == null) {
    col.nullCount++;
  }
}
