import { FileObject } from './file-object';
import { CSVReader, CSVBunch } from 'objio/server';
import { SERIALIZER } from 'objio';
import { ColumnAttr } from '../table';

export class CSVFileObject extends FileObject {
  protected columns = new Array<ColumnAttr>();

  onFileUploaded(): Promise<void> {
    const onNextBunch = (bunch: CSVBunch) => {
      this.columns = bunch.rows[0].map(col => {
        return {
          name: col,
          type: 'TEXT'
        };
      });

      bunch.done();
    };

    return CSVReader.read({
      linesPerBunch: 1,
      file: this.getPath(),
      onNextBunch
    }).then(() => {
      this.holder.save();
    });
  }

  static TYPE_ID = 'CSVFileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...FileObject.SERIALIZE(),
    columns:  { type: 'json' }
  })
}
