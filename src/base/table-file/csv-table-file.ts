import { TableFileBase } from './index';
import { SERIALIZER } from 'objio';

export abstract class CSVTableFile extends TableFileBase {
  protected firstRowIsCols = true;

  isFirstRowIsCols() {
    return this.firstRowIsCols;
  }

  setFirstRowIsCols(firstRowIsCols: boolean) {
    if (this.firstRowIsCols == firstRowIsCols)
      return;

    this.firstRowIsCols = firstRowIsCols;
    this.holder.delayedNotify();
  }

  getIcon() {
    return 'csv-icon';
  }

  static TYPE_ID = 'CSVTableFile';
  static SERIALIZE: SERIALIZER = () => ({
    ...TableFileBase.SERIALIZE(),
    firstRowIsCols: { type: 'string' }
  })
}
