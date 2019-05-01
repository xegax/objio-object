import {
  FileStorageBase,
  EntryData,
  StorageInfo,
  LoadDataArgs,
  LoadDataResult
} from '../base/file-storage';
import { IDArgs } from '../common/interfaces';
import { DatabaseHolder, ColumnToCreate } from './database/database-holder';
import { ServerSendFileArgs } from './file-object';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { genUUID, getExt } from '../common/common';
import { Stream } from 'stream';

interface SrvEntryData extends EntryData {
  userId: string;
}

type TColumnName = keyof SrvEntryData;
const fileSchema: {[key: string]: ColumnToCreate & { colName: TColumnName }} = {
  rowId: {
    colName: 'rowId',
    colType: 'integer',
    autoInc: true,
    unique: true,
    notNull: true,
    primary: true
  },
  userId: {
    colName: 'userId',
    colType: 'string'
  },
  fileId: {
    colName: 'fileId',
    colType: 'string',
    unique: true,
    notNull: true
  },
  size: {
    colName: 'size',
    colType: 'integer',
    notNull: true
  },
  type: {
    colName: 'type',
    colType: 'string'
  },
  hash: {
    colName: 'hash',
    colType: 'string',
    notNull: true
  },
  name: {
    colName: 'name',
    colType: 'string'
  },
  createDate: {
    colName: 'createDate',
    colType: 'integer',
    notNull: true
  },
  modifyDate: {
    colName: 'modifyDate',
    colType: 'integer',
    notNull: true
  }
};

export class FileStorage extends FileStorageBase {
  private initTask: Promise<void>;

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
        method: () => this.loadInfo(),
        rights: 'read'
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
          this.db.loadTableInfo({ tableName: this.fileTable })
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

  private createEntry(args: ServerSendFileArgs, userId: string): Promise<SrvEntryData> {
    const type = getExt(args.name).toLocaleLowerCase();
    const entry: SrvEntryData = {
      fileId: genUUID() + type,
      userId,
      hash: '-',
      name: args.name,
      size: args.size,
      type,
      createDate: Date.now(),
      modifyDate: Date.now()
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
    const folder = this.getPath();
    if (!existsSync(folder))
      mkdirSync(folder);

    return (
      this.createEntry(args, userId)
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

  loadInfo(): Promise<StorageInfo> {
    if (!this.db)
      return Promise.reject('db is not selected');

    if (!this.fileTable)
      return Promise.reject('table is not selected');

    return (
      this.db.loadTableInfo({ tableName: this.fileTable })
      .then(res => ({ filesCount: res.rowsNum }))
    );
  }

  loadData(args: LoadDataArgs): Promise<LoadDataResult> {
    if (!this.db)
      return Promise.reject('db is not selected');

    if (!this.fileTable)
      return Promise.reject('table is not selected');

    return (
      this.db.loadTableData({ tableName: this.fileTable, fromRow: args.from, rowsNum: args.count })
      .then(data => {
        let res: LoadDataResult = {
          files: data.rows as any
        };

        return res;
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
}
