import { CSVReader, CSVBunch, CSVReadArgs } from 'objio/common/csv-reader';
import { SERIALIZER } from 'objio';
import { CSVTableFile as Base } from '../../base/table-file/csv-table-file';
import { ReadLinesArgs, DataReader } from '../../base/table-file/data-reading-decl';
import { ColumnAttr } from '../../base/table-file/table-file-decl';
import { FileObject } from '../file-object';
import { onFileUpload } from './table-file';

export class CSVTableFile extends Base {
  constructor(args) {
    super(args);

    FileObject.initFileObj(this);
  }

  getDataReader(): DataReader {
    return {
      readCols: (): Promise< Array<ColumnAttr> > => {
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
      },
      readRows: (args: ReadLinesArgs): Promise<any> => {
        const discardCols = this.columns.filter(c => c.discard).map(col => col.name);
        const exclude = discardCols.length ? new Set(discardCols) : null;

        const readArgs: CSVReadArgs = {
          exclude,
          file: this.getPath(),
          rowsPerBunch: args.linesPerBunch,
          detectNumeric: true,
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
    };
  }

  onFileUploaded(userId: string): Promise<void> {
    return onFileUpload(this, userId);
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...Base.SERIALIZE()
  })
}
