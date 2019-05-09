import { MinMax } from '../common/interfaces';

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
  path?: Array<string>; // path == null will load info about all files of current user
  stat?: boolean; // get statistics
}

export interface StatInfo {
  size: MinMax;
  sizeSum: number;
  createDate: MinMax;
  modifyDate: MinMax;
}

export interface StorageInfo {
  guid: string;
  filesCount: number;
  stat?: StatInfo;
}

export interface LoadDataArgs {
  guid: string;
  from: number;
  count: number;
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

export interface CopyFileObjArgs {
  path: Array<string>;
  fileObjId: string;
  replaceEntryId?: string;
}

export interface UpdateArgs {
  fileId: string;
  newName: string;
}
