import { ObjectBase } from './object-base';
import { SERIALIZER } from 'objio';
import { DatabaseHolderBase } from './database-holder';
import { IDArgs, MinMax } from '../common/interfaces';
import { CompoundCond } from './database-holder-decl';

export interface EntryData {
  rowId?: number;
  fileId: string;
  type: string;
  hash: string;
  name: string;
  size: number;
  createDate: number;
  modifyDate: number;
  sub1: string;
  sub2: string;
  sub3: string;
}

export interface Folder {
  id: string;
  name: string;
}

export interface LoadInfoArgs {
  path: Array<string>;
}

export interface StorageInfo {
  guid: string;
  filesCount: number;
}

export interface LoadDataArgs {
  guid: string;
  from: number;
  count: number;
}

export interface LoadStatsResult {
  size: MinMax;
  createDate: MinMax;
  modifyDate: MinMax;
}

export interface LoadDataResult {
  files: Array<EntryData>;
}

export interface DeleteArgs {
  fileIds: Array<string>;
}

export interface LoadFolderArgs {
  path: Array<string>;
}

export interface LoadFolderResult {
  path: Array<Folder>;
  subfolder: Array<Folder>;
}

export interface CreateFolderArgs {
  path: Array<string>;
  name: string;
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
  abstract createFolder(args: CreateFolderArgs): Promise<void>;
  abstract loadFolder(args: LoadFolderArgs): Promise<LoadFolderResult>;
  abstract loadStats(): Promise<LoadStatsResult>;
  abstract setDatabase(args: IDArgs): Promise<void>;
  abstract loadInfo(args: LoadInfoArgs): Promise<StorageInfo>;
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
