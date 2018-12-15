import { SERIALIZER } from 'objio';
import { FileObject } from './file-object';
import { ColumnAttr } from '../base/table';
import { Bunch } from 'objio/common/line-reader';

export {
  Bunch
}

export interface OnRowsArgs {
  rows: ReadRowsResult;
  progress: number;
}

export interface ReadLinesArgs {
  linesPerBunch: number;
  file: string;
  onRows?(args: OnRowsArgs): Promise<any>;
}

export type ReadRowsResult = Array<{[key: string]: string}>;

export abstract class TableFileObject extends FileObject {
  protected columns = new Array<ColumnAttr>();

  abstract readRows(args: ReadLinesArgs): Promise<any>;
  abstract readCols(file: string): Promise< Array<ColumnAttr> >;

  onFileUploaded(): Promise<void> {
    return (
      this.readCols( this.getPath() )
      .then(cols => {
        this.columns = cols;
        console.log('columns', JSON.stringify(this.columns, null, ' '));
      })
    );
  }

  getColumns(args?: { discard: boolean }): Array<ColumnAttr> {
    args = args || { discard: false };
    if (args.discard == false)
      return this.columns.filter(col => col.discard != true);

    return this.columns;
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...FileObject.SERIALIZE(),
    columns:  { type: 'json' }
  })
}
