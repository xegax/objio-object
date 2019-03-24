import { CSVReader, CSVBunch, CSVReadArgs } from 'objio/common/csv-reader';
import { SERIALIZER } from 'objio';
import { CSVTableFile as Base } from '../../base/table-file/csv-table-file';
import { ReadLinesArgs } from '../../base/table-file/data-reading';
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
    return (
      CSVReader.read({
        file,
        rowsPerBunch: 1,
        onNextBunch: (bunch: CSVBunch) => {
          cols = Object.keys(bunch.rows[0]).map(name => {
            return { name, type: 'TEXT' };
          });

          bunch.stop();
        }
      })
      .then(() => cols)
    );
  }

  readRows(args: ReadLinesArgs): Promise<any> {
    const readArgs: CSVReadArgs = {
      file: this.getPath(),
      rowsPerBunch: args.linesPerBunch,
      onNextBunch: (bunch: CSVBunch) => {
        return (
          args.onRows({
            rows: bunch.rows,
            progress: bunch.progress
          })
          .catch(() => {
            bunch.stop();
          })
        );
      }
    };

    return CSVReader.read(readArgs);
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
