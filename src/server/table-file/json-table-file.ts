import { readJSONArray } from 'objio/common/reader/json-array-reader';
import { pushStat, StatMap } from 'objio/common/reader/statistics';
import { SERIALIZER } from 'objio';
import { JSONTableFile as Base } from '../../base/table-file/json-table-file';
import { ColumnAttr } from '../../base/table';
import { ReadLinesArgs, OnRowsArgs } from '../../base/table-file/data-reading';
import { FileObject } from '../file-object';

export class JSONTableFile extends Base {
  constructor(args) {
    super(args);

    FileObject.initFileObj(this);
  }

  protected readCols(): Promise<Array<ColumnAttr>> {
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

  protected pushStat = (args: OnRowsArgs, map: StatMap) => {
    this.setProgress(args.progress);
    pushStat(args.rows as Array<Object>, map);
    return Promise.resolve();
  }

  onFileUploaded(): Promise<void> {
    let statMap: StatMap = {};

    this.setStatMap({});
    this.holder.save();

    return (
      this.readCols()
      .then(cols => {
        this.columns = cols;
        this.holder.save();
        return (
          this.readRows({
            linesPerBunch: 100,
            onRows: args => this.pushStat(args, statMap)
          })
        );
      })
      .then(() => {
        this.setStatMap(statMap);
        this.holder.save();
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
