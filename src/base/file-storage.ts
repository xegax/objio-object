import { ObjectBase } from './object-base';
import { SERIALIZER } from 'objio';
import { DatabaseHolderBase } from './database-holder';
import { IDArgs } from '../common/interfaces';
import {
  CreateFolderArgs,
  LoadFolderArgs,
  LoadFolderResult,
  LoadInfoArgs,
  StorageInfo,
  LoadDataArgs,
  LoadDataResult,
  DeleteArgs,
  CopyFileObjArgs
} from './file-storage-decl';

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
  abstract createFolder(args: CreateFolderArgs): Promise<void>;
  abstract loadFolder(args: LoadFolderArgs): Promise<LoadFolderResult>;
  abstract setDatabase(args: IDArgs): Promise<void>;
  abstract loadInfo(args: LoadInfoArgs): Promise<StorageInfo>;
  abstract loadData(args: LoadDataArgs): Promise<LoadDataResult>;
  abstract delete(args: DeleteArgs): Promise<void>;
  abstract copyFileObject(args: CopyFileObjArgs): Promise<void>;

  static TYPE_ID = 'FileContainer2';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    db:         { type: 'object', const: true },
    fileTable:  { type: 'string', const: true },
    tagsTable:  { type: 'string', const: true }
  });
}
