import { CSVReader, CSVBunch } from 'objio/server';
import { SERIALIZER } from 'objio';
import { CSVTableFile as Base } from '../../base/table-file/csv-table-file';
import { ReadLinesArgs, ReadRowsResult } from '../../base/table-file/data-reading';
import { ColumnAttr } from '../../base/database/table';
import { FileObject } from '../file-object';
import { onFileUpload } from './table-file';

export class CSVTableFile extends Base {
  constructor(args) {
    super(args);

    FileObject.initFileObj(this);
  }

  readCols(): Promise< Array<ColumnAttr> > {
    const file = this.getPath();
    let cols: Array<ColumnAttr> = [];
    const isFirstRowIsCols = this.isFirstRowIsCols();
    return (
      CSVReader.read({
        file,
        linesPerBunch: 1,
        onNextBunch: (bunch: CSVBunch) => {
          cols = bunch.rows[0].map((col, i) => {
            return {
              name: isFirstRowIsCols ? col : 'column_' + i,
              type: 'TEXT'
            };
          });

          bunch.done();
        }
      })
      .then(() => cols)
    );
  }

  readRows(args: ReadLinesArgs): Promise<any> {
    let bunchIdx = 0;
    const cols = this.columns.map(col => col.name);
    const readArgs = {
      file: this.getPath(),
      linesPerBunch: args.linesPerBunch,
      onNextBunch: (bunch: CSVBunch) => {
        let rows = rawValsToRows(cols, bunch.rows);
        if (bunchIdx == 0 && this.isFirstRowIsCols())
          rows = rows.slice(1);

        bunchIdx++;
        return (
          args.onRows({
            rows,
            progress: bunch.progress
          })
          .catch(() => {
            bunch.done();
          })
        );
      }
    };

    return CSVReader.read(readArgs);
  }

  sendFile() {
    return Promise.reject('not implemented');
  }

  getDataReading() {
    return this;
  }

  onFileUploaded(userId: string): Promise<void> {
    return onFileUpload(this, userId);
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...Base.SERIALIZE()
  })
}

function rawValsToRows(cols: Array<string>, rows: Array<Array<string>>): ReadRowsResult {
  return (
    rows.map(values => {
      const row = {};

      for (let c = 0; c < values.length; c++) {
        const value = values[c].trim();
        row[ cols[c] ] = Number.isNaN(+value) ? value : +value;
      }

      return row;
    })
  );
}
