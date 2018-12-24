import { JSONReader, JSONBunch } from 'objio/common/json-reader';
import { SERIALIZER } from 'objio';
import { JSONTableFile as Base } from '../../base/table-file/json-table-file';
import { ColumnAttr } from '../../base/table';
import { ReadLinesArgs } from '../../base/table-file/data-reading';
import { FileObject } from '../file-object';

export class JSONTableFile extends Base {
  constructor(args) {
    super(args);

    FileObject.initFileObj(this);
  }

  readCols(): Promise<Array<ColumnAttr>> {
    const file = this.getPath();
    let cols: Array<ColumnAttr> = [];
    return (
      JSONReader.read({
        file,
        linesPerBunch: 1,
        onNextBunch: (bunch: JSONBunch) => {
          cols = (
            Object.keys(bunch.rows[0])
              .map(name => {
                return {
                  name,
                  type: 'TEXT'
                };
              })
          );
          bunch.done();
        }
      })
      .then(() => cols)
    );
  }

  readRows(args: ReadLinesArgs): Promise<any> {
    return (
      JSONReader.read({
        file: this.getPath(),
        linesPerBunch: args.linesPerBunch,
        onNextBunch: (bunch: JSONBunch) => {
          return (
            args.onRows({
              rows: bunch.rows,
              progress: bunch.progress
            })
              .catch(e => {
                bunch.done();
              })
          );
        }
      })
    );
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

  sendFile() {
    return Promise.reject('not implemented');
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...Base.SERIALIZE()
  })
}
