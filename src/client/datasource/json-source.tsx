import * as React from 'react';
import { JSONDataSourceBase } from '../../base/datasource/json-source';

export class JSONDataSource extends JSONDataSourceBase {
  getTableDesc(): Promise<any> {
    throw 'not allowed to call from client side';
  }

  getTableRows(): Promise<any> {
    throw 'not allowed to call from client side';
  }

  execute(): Promise<void> {
    throw 'not allowed to call from client side';
  }
}
