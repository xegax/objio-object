import { CSVReader, CSVBunch } from 'objio/server';
import { SERIALIZER } from 'objio';
import { TableFileObject, ReadLinesArgs, ReadRowsResult } from './table-file-object';
import { ColumnAttr } from '../base/table';

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

export class CSVFileObject extends TableFileObject {
  readCols(file: string): Promise< Array<ColumnAttr> > {
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
      file: args.file,
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

  static TYPE_ID = 'CSVFileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...TableFileObject.SERIALIZE()
  })
}
