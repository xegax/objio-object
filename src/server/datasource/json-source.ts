import {
  TableDescArgs,
  TableRowsArgs,
  TableDescResult,
  TableRowsResult
} from '../../base/datasource/data-source';
import { JSONDataSourceBase } from '../../base/datasource/json-source';
import { FileSystemSimple } from 'objio/server';
import { UploadArgs } from 'objio';
import { readJSONArray } from 'objio/common/reader/json-array-reader';
import { createWriteStream, readSync, openSync, closeSync } from 'fs';

const ROW_LENGTH = 16 + 16 + 2;

function row(start: number, count: number) {
  return ([start, count].join(', ') + '\n').padStart(ROW_LENGTH, ' ');
}

let buf = new Buffer(65535);
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

    this.holder.setMethodsToInvoke({
      getTableDesc: {
        method: (args: TableDescArgs) => this.getTableDesc(args),
        rights: 'read'
      },
      getTableRows: {
        method: (args: TableRowsArgs) => this.getTableRows(args),
        rights: 'read'
      }
    });
  }

  private onUploaded = (args: UploadArgs) => {
    this.totalRows = 0;
    this.totalCols = [];

    const rowsFile = this.fs.getPathForNew('rows', '.lst');
    const w = createWriteStream(rowsFile);
    this.setProgress(0);
    this.setStatus('in progress');
    let progress = 0;
    let rows = 0;
    let colsMap: {[name: string]: string} = {};
    readJSONArray({
      file: this.fs.getPath('content'),
      calcRanges: true,
      onBunch: args => {
        rows += args.items.length;
        args.items.forEach(item => {
          Object.keys(item.obj).forEach(k => colsMap[k] = '');
          w.write(row(item.range[0], item.range[1]));
        });
        let newp = Math.floor(args.progress * 10) / 10;
        if (newp != progress) {
          progress = newp;
          this.setProgress(newp);
        }
      }
    })
    .then(() => {
      this.totalCols = Object.keys(colsMap).map(name => ({ name }));
      this.totalRows = rows;
      this.setStatus('ok');
      this.setProgress(0);
      this.holder.save(true);

      w.close();
      this.fs.updateFiles({ 'rows': rowsFile });
      this.fs.holder.save();
    });
  }

  getTableDesc(args: TableDescArgs): Promise<TableDescResult> {
    return Promise.resolve({
      rows: this.totalRows,
      cols: this.totalCols.map(c => c.name)
    });
  }

  getTableRows(args: TableRowsArgs): Promise<TableRowsResult> {
    let fd = openSync(this.fs.getPath('rows'), 'r');
    let ranges = Array<{ from: number; count: number }>();
    for (let n = 0; n < args.rowsCount; n++) {
      let len = readSync(fd, buf, 0, ROW_LENGTH, ROW_LENGTH * (args.startRow + n));
      const range = buf.toString(undefined, 0, len).trim().split(',').map(v => +v);
      ranges.push({ from: range[0], count: range[1] });
    }
    closeSync(fd);

    let res: TableRowsResult = {
      startRow: args.startRow,
      rows: []
    };

    fd = openSync(this.fs.getPath('content'), 'r');
    for (let n = 0; n < args.rowsCount; n++) {
      const len = readSync(fd, buf, 0, ranges[n].count, ranges[n].from);
      let json = buf.toString(undefined, 0, len);
      const obj = JSON.parse(json);
      res.rows.push( this.totalCols.map(c => obj[c.name]) );
    }
    closeSync(fd);
    return Promise.resolve(res);
  }
}
