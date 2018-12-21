import { JSONReader, JSONBunch } from 'objio/common/json-reader';
import { SERIALIZER } from 'objio';
import { TableFileObject, ReadLinesArgs, Bunch } from './table-file-object';
import { ColumnAttr } from '../base/table';

export class JSONFileObject extends TableFileObject {
  readCols(file: string): Promise< Array<ColumnAttr> > {
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
        file: args.file,
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

  static TYPE_ID = 'JSONFileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...TableFileObject.SERIALIZE()
  })
}
