import { Database } from 'sqlite3';

export class SQLite {
  private db: Database;

  private constructor(db: Database) {
    this.db = db;
  }

  static open(file: string): Promise<SQLite> {
    return new Promise((resolve, reject) => {
      const db = new Database(file, err => {
        if (err)
          return reject(err);

        resolve(new SQLite(db));
      });
    });
  }

  createTable(args: { table: string, columns: Columns }) {
    return createTable(this.db, args.table, args.columns);
  }

  deleteTable(table: string) {
    return deleteTable(this.db, table);
  }

  exec(sql: string) {
    return exec(this.db, sql);
  }

  insert(args: { table: string; cols?: Array<string>; values: Array<{[key: string]: string}> }) {
    return insert({
      db: this.db,
      columns: args.cols,
      table: args.table,
      values: args.values
    });
  }

  getRows(args: { table: string; from: number; count: number, cols?: Array<string> }) {
    let cols = args.cols ? args.cols.join(', ') : '*';
    return all(this.db, `select ${cols} from ${args.table} limit ${args.count} offset ${args.from}`);
  }

  createView(args: { table: string, view: string, cols?: Array<string>, sort?: Array<{ name: string; asc: boolean }> }) {
    const cols = args.cols ? args.cols.join(', ') : '*';
    let orderBy = '';
    if (args.sort && args.sort.length)
      orderBy = 'order by ' + args.sort.map(c => `${c.name} ${c.asc ? 'asc' : 'desc'}`).join(', ');
    return exec(this.db, `create temp table "${args.view}" as select ${cols} from ${args.table} ${orderBy}`);
  }

  fetchTableInfo(args: { table: string }): Promise<Columns> {
    return (
      all<ColumnAttr>(this.db, `pragma table_info(${args.table})`)
      .then(res => res.map(row => ({
          name: row.name,
          type: row.type
        }))
      )
    );
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close(err => {
        if (err)
          return reject(err);

        resolve();
      });
    });
  }
}

export interface PushRowArgs {
  columns?: Array<string>;
  values: Array<{[key: string]: string}>;
}

export interface ColumnAttr {
  name: string;
  type: string;
  notNull?: boolean;
  primary?: boolean;
  autoInc?: boolean;
  unique?: boolean;
}

export type Columns = Array<ColumnAttr>;

export function sqlInt(int: number | string) {
  return +int;
}

export function sqlColumn(column: string) {
  return column;
}

export function sqlTable(table: string) {
  return table;
}

export function quoteValue(value: string | number) {
  value = ('' + value).replace(/"/g, '\\\"');
  return `"${value}"`;
}

export function srPromise(db: Database, callback: (resolve, reject) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      callback(resolve, reject);
    });
  });
}

export function exec(db: Database, sql: string): Promise<any> {
  return srPromise(db, (resolve, reject) => {
    db.exec(sql, err => {
      if (!err) {
        resolve();
      } else {
        console.log('error at', sql);
        reject(err);
      }
    });
  });
}

export function run(db: Database, sql: string, params: Array<any>): Promise<any> {
  return srPromise(db, (resolve, reject) => {
    db.run(sql, params, err => {
      if (!err) {
        resolve();
      } else {
        console.log('error at', sql);
        reject(err);
      }
    });
  });
}

export function all<T = Object>(db: Database, sql: string, params?: Array<any>): Promise<Array<T>> {
  return srPromise(db, (resolve, reject) => {
    db.all(sql, params || [], (err, rows: Array<T>) => {
      if (err)
        return reject(err);
      resolve(rows);
    });
  });
}

export function get<T = Object>(db: Database, sql: string): Promise<T> {
  return srPromise(db, (resolve, reject) => {
    db.get(sql, (err, row: T) => {
      if (err)
        return reject(err);
      resolve(row);
    });
  });
}

export function createTable(db: Database, table: string, columns: Columns): Promise<any> {
  const sql = columns.map(column => {
    let value = `${column.name} ${column.type}`;
    if (column.notNull)
      value += ' NOT NULL';
    if (column.primary)
      value += ' PRIMARY KEY';
    if (column.autoInc)
      value += ' AUTOINCREMENT';
    if (column.unique)
      value += ' UNIQUE';
    return value;
  }).join(', ');
  return exec(db, `create table ${table} (${sql})`);
}

export function deleteTable(db: Database, table: string): Promise<void> {
  return exec(db, `drop table if exists ${table}`);
}

export function deleteData(args: {db: Database, table: string, where?: string}): Promise<void> {
  let where = args.where || '';
  if (where)
    where = `where ${where}`;
  const sql = `delete from ${args.table} ${where}`;

  console.log(sql);
  return exec(args.db, sql);
}

export function loadTableInfo(db: Database, table: string): Promise<Columns> {
  return (
    all<ColumnAttr>(db, `pragma table_info(${table})`)
    .then(res => {
      return res.map(row => ({name: row['name'], type: row['type']}));
    })
  );
}

export function loadTableList(db: Database): Promise<Array<string>> {
  return (
    all(db, `select * from sqlite_master where type = 'table'`)
    .then(res => {
      return res.map(row => row['name']);
    })
  );
}

export function loadRowsNum(db: Database, table: string): Promise<number> {
  return (
    get<{count: number}>(db, `select count(*) as count from ${table}`)
    .then(res => {
      return +res.count;
    })
  );
}

export function insert(args: PushRowArgs & { table: string; db: Database }): Promise<any> {
  const cols: {[name: string]: number} = {};
  const valuesArr = Array<string>();
  const holderArr = Array<string>();
  const values = args.values;
  if (!args.columns) {
    for (let n = 0; n < values.length; n++) {
      const keys = Object.keys(values[n]);
      for (let c = 0; c < keys.length; c++) {
        cols[ keys[c] ] = ( cols[ keys[c] ] || 0 ) + 1;
      }
    }
  }

  const colsArr = args.columns || Object.keys(cols);
  for (let n = 0; n < values.length; n++) {
    for (let c = 0; c < colsArr.length; c++) {
      valuesArr.push(values[n][ colsArr[c] ] as string || null);
    }
    holderArr.push( '(' + colsArr.map(() => '?').join(',') + ')' );
  }

  const allCols = colsArr.join(',');
  const sql = `insert into ${args.table}(${allCols}) values ${holderArr.join(',')};`;
  return run(args.db, sql, valuesArr);
}
