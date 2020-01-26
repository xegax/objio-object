import { SERIALIZER, FileSystemSimple } from 'objio';
import { ObjectBase } from '../object-base';
import { ColumnAttr } from './table-file-decl';
import { DataReader } from './data-reading-decl';
import { StatMap } from 'objio/common/reader/statistics';

export abstract class TableFileBase extends ObjectBase {
  protected columns = Array<ColumnAttr>();
  protected statMap: StatMap = {};
  protected rows: number = 0;

  constructor() {
    super();
    this.fs = new FileSystemSimple();
  }

  getPath(key?: string) {
    return this.fs.getPath(key || 'content');
  }

  setRows(rows: number) {
    this.rows = rows;
  }

  getRows() {
    return this.rows;
  }

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
  abstract getDataReader(): DataReader;

  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    columns: { type: 'json', const: true },
    statMap: { type: 'json', const: true },
    rows: { type: 'integer', const: true }
  })
}
