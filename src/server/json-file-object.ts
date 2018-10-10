import { FileObject } from './file-object';
import { JSONReader, JSONBunch } from 'objio/common/json-reader';
import { SERIALIZER } from 'objio';
import { ColumnAttr } from '../client/table';

export class JSONFileObject extends FileObject {
  protected columns = new Array<ColumnAttr>();

  onFileUploaded(): Promise<void> {
    const onNextBunch = (bunch: JSONBunch) => {
      const row = bunch.rows[0];
      this.columns = (
        Object.keys(row)
        .map(col => {
          return {
            name: col,
            type: 'TEXT'
          };
        })
      );

      bunch.done();
    };

    return JSONReader.read({
      linesPerBunch: 1,
      file: this.getPath(),
      onNextBunch
    }).then(() => {
      console.log('json columns', JSON.stringify(this.columns, null, ' '));
    });
  }

  static TYPE_ID = 'JSONFileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...FileObject.SERIALIZE(),
    columns:  { type: 'json' }
  })
}
