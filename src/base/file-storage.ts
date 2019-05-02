import { ObjectBase } from './object-base';
import { SERIALIZER } from 'objio';
import { DatabaseHolderBase } from './database-holder';
import { IDArgs } from '../common/interfaces';

export interface EntryData {
  rowId?: number;
  fileId: string;
  type: string;
  hash: string;
  name: string;
  size: number;
  createDate: number;
  modifyDate: number;
}

export interface StorageInfo {
  filesCount: number;
}

export interface LoadDataArgs {
  from: number;
  count: number;
}

export interface LoadDataResult {
  files: Array<EntryData>;
}

export interface DeleteArgs {
  fileIds: Array<string>;
}

export abstract class FileStorageBase extends ObjectBase {
  protected db: DatabaseHolderBase;
  protected fileTable: string;
  protected tagsTable: string;

  getDatabase(): DatabaseHolderBase {
    return this.db;
  }

  getPath(file?: string) {
    return this.holder.getPublicPath(this.holder.getID() + (file ? '/' + file : ''));
  }

  // setDatabase will create tables
  abstract setDatabase(args: IDArgs): Promise<void>;
  abstract loadInfo(): Promise<StorageInfo>;
  abstract loadData(args: LoadDataArgs): Promise<LoadDataResult>;
  abstract delete(args: DeleteArgs): Promise<void>;

  static TYPE_ID = 'FileContainer2';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    db:         { type: 'object', const: true },
    fileTable:  { type: 'string', const: true },
    tagsTable:  { type: 'string', const: true }
  });
}
