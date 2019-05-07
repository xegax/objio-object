import {
  FileStorageBase,
  EntryData,
  StorageInfo,
  LoadDataArgs,
  LoadDataResult,
  DeleteArgs,
  LoadStatsResult,
  LoadInfoArgs,
  LoadFolderArgs,
  CreateFolderArgs,
  Folder
} from '../base/file-storage';
import { IDArgs } from '../common/interfaces';
import { DatabaseHolder, ColumnToCreate } from './database/database-holder';
import { CompoundCond } from '../base/database-holder-decl';
import { ServerSendFileArgs } from './file-object';
import { createWriteStream, mkdirSync, existsSync, unlinkSync } from 'fs';
import { genUUID, getExt } from '../common/common';
import { Stream } from 'stream';
import { ValueCond } from '../base/database-holder-decl';
import { SERIALIZER } from 'objio';

const MAX_FOLDER_DEPTH = 3;
const MAX_SUBFOLDERS = 32;
const pathCols = [ 'sub1', 'sub2', 'sub3' ];

interface SrvEntryData extends EntryData {
  userId: string;
}

type FolderSrv = {
  id: string;
  name: string;
  subfolder: Array<FolderSrv>;
};

type TColumnName = keyof SrvEntryData;
type Column = ColumnToCreate & { colName: TColumnName };
const fileSchema = {
  rowId: {
    colName: 'rowId',
    colType: 'integer',
    autoInc: true,
    unique: true,
    notNull: true,
    primary: true
  } as Column,
  userId: {
    colName: 'userId',
    colType: 'string'
  } as Column,
  fileId: {
    colName: 'fileId',
    colType: 'string',
    unique: true,
    notNull: true
  } as Column,
  size: {
    colName: 'size',
    colType: 'integer',
    notNull: true
  } as Column,
  type: {
    colName: 'type',
    colType: 'string'
  } as Column,
  hash: {
    colName: 'hash',
    colType: 'string',
    notNull: true
  } as Column,
  name: {
    colName: 'name',
    colType: 'string'
  } as Column,
  createDate: {
    colName: 'createDate',
    colType: 'integer',
    notNull: true
  } as Column,
  modifyDate: {
    colName: 'modifyDate',
    colType: 'integer',
    notNull: true
  } as Column,
  sub1: {
    colName: 'sub1',
    colType: 'string'
  } as Column,
  sub2: {
    colName: 'sub2',
    colType: 'string'
  } as Column,
  sub3: {
    colName: 'sub3',
    colType: 'string'
  }
};

export class FileStorage extends FileStorageBase {
  private initTask: Promise<void>;
  private srvFolder: FolderSrv = {
    id: 'root',
    name: 'root',
    subfolder: []
  };
  private folderIdCounter: number = 0;

  constructor() {
    super();

    this.holder.setMethodsToInvoke({
      setDatabase: {
        method: (args: IDArgs) => this.setDatabase(args),
        rights: 'write'
      },
      sendFile: {
        method: (args: ServerSendFileArgs, userId: string) => this.sendFileImpl(args, userId),
        rights: 'write'
      },
      loadData: {
        method: (args: LoadDataArgs) => this.loadData(args),
        rights: 'read'
      },
      loadInfo: {
        method: (args: LoadInfoArgs, userId: string) => this.loadInfo(args, userId),
        rights: 'read'
      },
      delete: {
        method: (args: DeleteArgs) => this.delete(args),
        rights: 'write'
      },
      loadStats: {
        method: () => this.loadStats(),
        rights: 'read'
      },
      loadFolder: {
        method: (args: LoadFolderArgs) => this.loadFolder(args),
        rights: 'read'
      },
      createFolder: {
        method: (args: CreateFolderArgs) => this.createFolder(args),
        rights: 'write'
      }
    });

    this.holder.addEventHandler({
      onCreate: () => {
        this.setStatus('not configured');
        return Promise.resolve();
      },
      onLoad: () => {
        if (!this.db) {
          this.setStatus('not configured')
          return Promise.resolve();
        }

        return (
          this.db.loadTableGuid({ tableName: this.fileTable })
          .then(() => {
            this.setStatus('ok');
          })
          .catch(() => {
            this.setStatus('not configured');
          })
        )
      }
    });
  }

  private createEntry(args: ServerSendFileArgs, userId: string, path?: Array<string>): Promise<SrvEntryData> {
    path = path || [];
    const type = getExt(args.name).toLocaleLowerCase();
    const entry: SrvEntryData = {
      fileId: genUUID() + type,
      userId,
      hash: '-',
      name: args.name,
      size: args.size,
      type,
      createDate: Date.now(),
      modifyDate: Date.now(),
      sub1: path[0] || '',
      sub2: path[1] || '',
      sub3: path[2] || ''
    };

    return (
      this.db.pushData({
        tableName: this.fileTable,
        rows: [ entry as any ]
      })
      .then(() => {
        this.holder.save(true);
        return entry;
      })
    );
  }

  private writeToFile(entry: SrvEntryData, inStrm: Stream) {
    const ws = createWriteStream(this.getPath(entry.fileId));

    let received = 0;
    let loadSize = 0;
    let p = new Promise(resolve => {
      inStrm.pipe(ws);
      inStrm.on('data', chunk => {
        received += chunk.length;
        if (typeof chunk == 'string')
          loadSize += chunk.length;
        else
          loadSize += chunk.byteLength;

        this.setProgress(loadSize / entry.size);
      });
      ws.on('close', () => {
        this.holder.save();
        resolve(received);
      });
    });

    return p;
  }

  private sendFileImpl = (args: ServerSendFileArgs, userId: string) => {
    console.log('other', args.other);
    const folder = this.getPath();
    if (!existsSync(folder))
      mkdirSync(folder);

    let path = Array<string>();
    try {
      path = JSON.parse(args.other || '[]');
    } catch(e) {
    }
  
    return (
      this.createEntry(args, userId, path)
      .then(entry => this.writeToFile(entry, args.data))
    );
  };

  private initTables(args: { fileTable: string, tagsTable: string, tryNum?: number }): Promise<void> {
    const fileTable = args.tryNum ? `${args.fileTable}_${args.tryNum}` : args.fileTable;
    return (
      this.db.createTable({
        tableName: fileTable,
        columns: Object.keys(fileSchema).map(k => fileSchema[k])
      })
      .then(() => {
        this.fileTable = fileTable;
      })
      .catch(() => {
        args.tryNum = (args.tryNum || 0) + 1;
        if (args.tryNum >= 50)
          return Promise.reject(`create table failed`);

        return this.initTables(args);
      })
    );
  }

  loadInfo(args: LoadInfoArgs, userId?: string): Promise<StorageInfo> {
    if (!this.db)
      return Promise.reject('db is not selected');

    if (!this.fileTable)
      return Promise.reject('table is not selected');

      let cond: CompoundCond = {
        op: 'and',
        values: []
      };
      
      const pathCond: CompoundCond = {
        op: 'and',
        values: pathCols.map((column, i) => ({
          column,
          value: args.path[i] || ''
        }))
      };
  
      const accss: CompoundCond = {
        op: 'or',
        values: [
          {
            column: fileSchema.userId.colName,
            value: ''
          },
          {
            column: fileSchema.userId.colName,
            value: userId
          }
        ]
      };

      if (pathCond.values.length)
        cond.values.push(pathCond);
      cond.values.push(accss);
  
      if (pathCond.values.length == 0)
        cond = null;

    return (
      this.db.loadTableGuid({ tableName: this.fileTable, desc: true, cond })
      .then(res => ({ guid: res.guid, filesCount: res.desc.rowsNum }))
    );
  }

  loadData(args: LoadDataArgs): Promise<LoadDataResult> {
    if (!this.db)
      return Promise.reject('db is not selected');

    if (!this.fileTable)
      return Promise.reject('table is not selected');

    return (
      this.db.loadTableData({ guid: args.guid, from: args.from, count: args.count })
      .then(data => {
        let res: LoadDataResult = {
          files: data.rows as any
        };

        return res;
      })
    );
  }

  loadStats(): Promise<LoadStatsResult> {
    if (!this.db)
      return Promise.reject('db is not selected');

    return Promise.resolve(null);
  }

  loadFolder(args: LoadFolderArgs) {
    if (!this.db)
      return Promise.reject('db is not selected');

    const folder = this.findFolder(args.path);
    if (!folder)
      return Promise.reject(`path not found`);

    return Promise.resolve({
      path: this.makePath(args.path),
      subfolder: folder.subfolder.map(f => {
        return {
          id: f.id,
          name: f.name
        };
      })
    });
  }

  makePath(path: Array<string>): Array<Folder> {
    let arr = Array<Folder>();

    let f = this.srvFolder;
    for (let n = 0; n < path.length; n++) {
      const curr = f.subfolder.find(f => f.id == path[n]);
      if (!curr)
        return null;

      f = curr;
      arr.push({ id: f.id, name: f.name });
    }

    return arr;
  }

  findFolder(path: Array<string>): FolderSrv {
    let f: FolderSrv = this.srvFolder;
    for (let n = 0; n < path.length; n++) {
      const next = f.subfolder.find(f => path[n] == f.id);
      if (!next)
        return null;
      f = next;
    }

    return f;
  }

  createFolder(args: CreateFolderArgs) {
    if (!this.db)
      return Promise.reject('db is not selected');

    if (args.path.length >= MAX_FOLDER_DEPTH)
      return Promise.reject(`folder depth cannot be greater than ${MAX_FOLDER_DEPTH}`);

    let folder: FolderSrv = this.findFolder(args.path);
    if (!folder)
      return Promise.reject('path not found');

    if (folder.subfolder.length >= MAX_SUBFOLDERS)
      return Promise.reject(`one folder cannot contains greater than ${MAX_SUBFOLDERS} folders`);

    if (folder.subfolder.find(f => f.name == args.name))
      return Promise.reject('folder with same name already exists');

    this.folderIdCounter++;
    let newFolder: FolderSrv = {
      id: 'fid-' + this.folderIdCounter,
      name: args.name,
      subfolder: []
    };
    folder.subfolder.push(newFolder);

    this.holder.save(true);
    return Promise.resolve();
  }

  delete(args: DeleteArgs) {
    const cond: Array<ValueCond> = args.fileIds.map(id => {
      return {
        column: 'fileId',
        value: id
      };
    });

    args.fileIds.forEach(fileId => {
      const path = this.getPath(fileId);
      if (!existsSync(path)) {
        console.log(`fileId=${fileId} does't exists`);
      } else {
        unlinkSync(path);
      }
    });

    return (
      this.db.deleteData({
        tableName: this.fileTable,
        cond: {
          op: 'or',
          values: cond
        }
      })
      .then(() => {
        this.holder.save(true);
      })
    );
  }

  setDatabase(args: IDArgs) {
    if (this.initTask)
      return this.initTask;

    return  (
      this.initTask = this.holder.getObject<DatabaseHolder>(args.id)
      .then(db => {
        if (!(db instanceof DatabaseHolder))
          return Promise.reject('invalid database object');

        this.db = db;
        this.holder.save();

        return this.initTables({
          fileTable: `_fste_ftbl_${this.getID()}`,
          tagsTable: `_fste_tags_${this.getID()}`
        });
      })
      .then(() => {
        this.initTask = null;
        this.setStatus('ok');
        this.holder.save(true);
      })
      .catch(e => {
        this.initTask = null;
        return Promise.reject(e);
      })
    );
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...FileStorageBase.SERIALIZE(),
    srvFolder:        { type: 'json', tags: [ 'sr' ] },
    folderIdCounter:  { type: 'number', tags: [ 'sr' ]}
  });
}
