import { SERIALIZER } from 'objio';
import { FileObjectBase, SendFileArgs } from '../file-object';
import { ColumnAttr } from '../../base/database/table';
import { DataReading } from './data-reading';
import { StatMap } from 'objio/common/reader/statistics';

export { SendFileArgs };

export abstract class TableFileBase extends FileObjectBase {
  protected columns = Array<ColumnAttr>();
  protected statMap: StatMap = {};

  setColumns(cols: Array<ColumnAttr>) {
    this.columns = cols;
  }

  getColumns(args?: { discard: boolean }): Array<ColumnAttr> {
    args = args || { discard: false };
    if (args.discard == false)
      return this.columns.filter(col => col.discard != true);

    return this.columns;
  }

  setColumn(col: Partial<ColumnAttr>): void {
    const colItem = this.columns.find(column => column.name == col.name);
    if (!colItem)
      return;

    let changes = 0;
    Object.keys(col).forEach(k => {
      if (col[k] == colItem[k])
        return;

      changes++;
      colItem[k] = col[k];
    });

    if (changes == 0)
      return;

    this.holder.save();
  }

  getStatMap(): StatMap {
    return this.statMap;
  }

  setStatMap(map: StatMap) {
    this.statMap = map;
  }

  // server side implementation
  abstract getDataReading(): DataReading;

  static SERIALIZE: SERIALIZER = () => ({
    ...FileObjectBase.SERIALIZE(),
    columns: { type: 'json' },
    statMap: { type: 'json' }
  })
}
