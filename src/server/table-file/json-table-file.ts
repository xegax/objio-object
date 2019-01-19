import { readJSONArray } from 'objio/common/reader/json-array-reader';
import { SERIALIZER } from 'objio';
import { JSONTableFile as Base } from '../../base/table-file/json-table-file';
import { ColumnAttr } from '../../base/database/table';
import { ReadLinesArgs } from '../../base/table-file/data-reading';
import { FileObject } from '../file-object';
import { onFileUpload } from './table-file';

export class JSONTableFile extends Base {
  constructor(args) {
    super(args);

    FileObject.initFileObj(this);
  }

  readCols(): Promise<Array<ColumnAttr>> {
    const file = this.getPath();
    let cols: Array<ColumnAttr> = [];
    return (
      readJSONArray({
        file,
        itemsPerBunch: 1,
        onBunch: args => {
          cols = (
            Object.keys(args.items[0])
              .map(name => {
                return {
                  name,
                  type: 'TEXT'
                };
              })
          );
          return 'stop';
        }
      })
      .then(() => cols)
    );
  }

  readRows(args: ReadLinesArgs): Promise<any> {
    return (
      readJSONArray({
        file: this.getPath(),
        itemsPerBunch: args.linesPerBunch,
        onBunch: bunch => {
          return (
            args.onRows({ rows: bunch.items as any, progress: bunch.progress })
            .catch(e => {
              return 'stop';
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
    return onFileUpload(this);
  }

  sendFile() {
    return Promise.reject('not implemented');
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...Base.SERIALIZE()
  })
}
