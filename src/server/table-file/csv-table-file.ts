import { CSVReader, CSVBunch } from 'objio/server';
import { SERIALIZER } from 'objio';
import { CSVTableFile as Base } from '../../base/table-file/csv-table-file';
import { ReadLinesArgs, ReadRowsResult } from '../../base/table-file/data-reading';
import { ColumnAttr } from '../../base/table';
import { JSONTableFile } from '../../base/table-file/json-table-file';
import { FileObject } from '../file-object';

export class CSVTableFile extends Base {
  constructor(args) {
    super(args);

    FileObject.initFileObj(this);
  }

  readCols(): Promise< Array<ColumnAttr> > {
    const file = this.getPath();
    let cols: Array<ColumnAttr> = [];
    return (
      CSVReader.read({
        file,
        linesPerBunch: 1,
        onNextBunch: (bunch: CSVBunch) => {
          cols = bunch.rows[0].map(col => {
            return {
              name: col,
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
    const cols = this.columns.map(col => col.name);
    const readArgs = {
      file: this.getPath(),
      linesPerBunch: args.linesPerBunch,
      onNextBunch: (bunch: CSVBunch) => {
        return (
          args.onRows({
            rows: rawValsToRows(cols, bunch.rows),
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

  onFileUploaded(): Promise<void> {
    return (
      this.readCols()
      .then(cols => {
        this.columns = cols;
        console.log('columns', JSON.stringify(this.columns, null, ' '));
      })
    );
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...Base.SERIALIZE()
  })
}

function rawValsToRows(cols: Array<string>, rows: Array<Array<string>>): ReadRowsResult {
  return (
    rows.map(values => {
      const row = {};

      for (let c = 0; c < values.length; c++)
        row[ cols[c] ] = values[c];

      return row;
    })
  );
}
