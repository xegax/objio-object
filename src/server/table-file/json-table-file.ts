import { readJSONArray } from 'objio/common/reader/json-array-reader';
import { SERIALIZER } from 'objio';
import { JSONTableFile as Base } from '../../base/table-file/json-table-file';
import { ColumnAttr } from '../../base/table-file/table-file-decl';
import { ReadLinesArgs } from '../../base/table-file/data-reading-decl';
import { onFileUpload } from './table-file';
import { DataReader } from './index';
import { FileSystemSimple } from 'objio/server';

export class JSONTableFile extends Base {
  protected fs: FileSystemSimple;

  constructor() {
    super();
    this.fs = new FileSystemSimple();

    this.holder.addEventHandler({
      onLoad: this.onInit,
      onCreate: this.onInit
    });
  }

  private onInit = () => {
    this.fs.holder.addEventHandler({
      onUpload: args => {
        onFileUpload(this, args.userId);
      }
    });
    return Promise.resolve();
  }

  getDataReader(): DataReader {
    return {
      readCols: (): Promise<Array<ColumnAttr>> => {
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
      },
      readRows: (args: ReadLinesArgs): Promise<any> => {
        const discardCols = this.columns.filter(c => c.discard).map(col => col.name);
        const exclude = discardCols.length ? new Set(discardCols) : null;
        return (
          readJSONArray({
            file: this.getPath(),
            itemsPerBunch: args.linesPerBunch,
            exclude,
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
    };
  }

  onFileUploaded(userId: string): Promise<void> {
    return onFileUpload(this, userId);
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...Base.SERIALIZE()
  })
}
