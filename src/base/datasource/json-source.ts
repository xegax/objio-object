import { DataSourceBase } from './data-source';
import { SERIALIZER, FileSystemSimple } from 'objio';

export abstract class JSONDataSourceBase extends DataSourceBase {
  constructor(args?) {
    super(args);

    this.fs = new FileSystemSimple();
  }

  getIcon() {
    return 'json-icon';
  }

  static TYPE_ID = 'JSONDataSource';
  static SERIALIZE: SERIALIZER = () => ({
    ...DataSourceBase.SERIALIZE()
  })
}
