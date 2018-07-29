import { CSVFileObject as CSVFileObjectBase } from '../csv-file-object';
import { CSVReader, CSVBunch } from 'objio/server';
import { ServerFileObjectImpl } from './file-object';

export class CSVFileObject extends CSVFileObjectBase implements ServerFileObjectImpl {
  onFileUploaded(): Promise<any> {
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
      file: this.holder.getFilePath(this.getPath()),
      onNextBunch
    }).then(() => {
      this.holder.save();
    });
  }
}
