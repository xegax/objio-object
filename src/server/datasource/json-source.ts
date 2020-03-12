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
import { createWriteStream, promises} from 'fs';

const ROW_LENGTH = 16 + 16 + 2;

function row(start: number, count: number) {
  return ([start, count].join(', ') + '\n').padStart(ROW_LENGTH, ' ');
}

let maxBufferSize = 65535;
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
        this.setProgress(args.progress);
      }
    })
    .then(() => {
      this.totalCols = Object.keys(colsMap).map(name => ({ name }));
      this.totalRows = rows;
      this.setStatus('ok');
      this.setProgress(0);
      this.holder.save(true);

      w.end();
      this.fs.updateFiles({ 'rows': rowsFile });
      this.fs.holder.save();
      this.holder.delayedNotify({ type: 'ready' });
    });
  }

  getTableDesc(args: TableDescArgs): Promise<TableDescResult> {
    return Promise.resolve({
      rows: this.totalRows,
      cols: this.totalCols.map(c => c.name)
    });
  }

  private loadRowsRange(from: number, count: number): Promise<Array<{ from: number; count: number; }>> {
    let arr = Array<{ from: number, count: number }>();
  
    const tmp = Buffer.alloc(ROW_LENGTH);
    const nextRead = (fh: promises.FileHandle) => {
      return (
        fh.read(tmp, 0, ROW_LENGTH, ROW_LENGTH *  (from + arr.length))
        .then(res => {
          if (res.bytesRead != ROW_LENGTH) {
            return (
              fh.close()
              .then(() => Promise.reject(new Error('Size mismatch')))
            );
          }

          const range = tmp.toString(undefined, 0, res.bytesRead).trim().split(',').map(v => +v);
          arr.push({ from: range[0], count: range[1] });
          if (arr.length >= count)
            return fh.close();

          return nextRead(fh);
        })
      );
    };

    return (
      promises.open(this.fs.getPath('rows'), 'r')
      .then(fh => nextRead(fh))
      .then(() => arr)
    );
  }

  private loadRows = (ranges: Array<{ from: number; count: number }>): Promise<Array< Array<string | number> >> => {
    const rows = Array< Array<string | number> >(); 
    let tmp = Buffer.alloc(maxBufferSize);
    let n = 0;
    const nextRead = (fh: promises.FileHandle) => {
      const range = ranges[n++];
      if (range.count > tmp.byteLength) {
        maxBufferSize = range.count;
        tmp = Buffer.alloc(maxBufferSize);
      }

      return (
        fh.read(tmp, 0, range.count, range.from)
        .then(res => {
          if (res.bytesRead != range.count) {
            return (
              fh.close()
              .then(() => Promise.reject(new Error('Size mismatch')))
            );
          }

          let json = tmp.toString(undefined, 0, res.bytesRead);
          const obj = JSON.parse(json);
          rows.push( this.totalCols.map(c => obj[c.name]) );
          if (rows.length >= ranges.length)
            return fh.close();

          return nextRead(fh);
        })
      );
    };

    return (
      promises.open(this.fs.getPath('content'), 'r')
      .then(fh => nextRead(fh))
      .then(() => rows)
    );
  }

  getTableRows(args: TableRowsArgs): Promise<TableRowsResult> {
    return (
      this.loadRowsRange(args.startRow, args.rowsCount)
      .then(this.loadRows)
      .then(rows => ({ startRow: args.startRow, rows }))
    );
  }
}
