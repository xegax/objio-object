import { SERIALIZER } from 'objio';
import { getExt } from '../client/file-object';
import { Table } from './table';
import { ColumnAttr } from '../client/table';
import { FilesContainer as Base, Loading, SendFileArgs } from '../client/files-container';
import * as http from 'http';
import * as fs from 'fs';
import { createWriteStream } from 'fs';

function getColumns(): Array<ColumnAttr> {
  return [
    {
      name: 'origName',
      type: 'VARCHAR(256)'
    }, {
      name: 'ext',
      type: 'VARCHAR(16)'
    }, {
      name: 'size',
      type: 'INTEGER'
    }, {
      name: 'fileName',
      type: 'VARCHAR(72)'
    }, {
      name: 'userId',
      type: 'VARCHAR(32)'
    }
  ];
}

export class FilesContainer extends Base {
  protected loadingUserMap: { [userId: string]: Loading } = {};

  constructor() {
    super();

    this.holder.addEventHandler({
      onCreate: this.onCreate
    });

    this.holder.setMethodsToInvoke({
      'send-file': { method: this.sendFileImpl, rights: 'write' }
    });
  }

  onCreate = () => {
    let table = new Table({
      source: this.database,
      userIdColumn: 'userId'
    });
    return (
      this.holder.createObject(table)
      .then(() => {
        fs.mkdirSync(this.holder.getFilePath(this.getDirPath()));
        this.table = table;
        this.holder.save();
        table.holder.save();
      })
      .then(() => {
        return this.table.execute({
          table: 'files_container_' + this.holder.getID(),
          columns: getColumns()
        });
      })
    );
  }

  generateFileName(ext: string): string {
    let file = [
      Math.random().toString(32).substr(2),
      Math.random().toString(32).substr(2)
    ].join('') + ext;
    return file;
  }

  getUserProgress(userId: string): Loading {
    return this.loadingUserMap[userId] || (this.loadingUserMap[userId] = { ...this.loading });
  }

  sendFileImpl = (args: { name: string, size: number, mime: string, data: http.IncomingMessage }, userId: string) => {
    const ext = getExt(args.name);
    const file = this.generateFileName(ext);
    return (
      Promise.resolve()
      .then(() => {
        return new Promise(resolve => {
          let loaded = 0;
          let loading = this.getUserProgress(userId);
          loading.loading = true;
          loading.name = args.name;
          this.holder.save();

          args.data.pipe(createWriteStream( this.getPath(file) ));
          args.data.on('data', chunk => {
            let chunkSize = 0;
            if (typeof chunk == 'string')
              chunkSize = chunk.length;
            else
              chunkSize = chunk.byteLength;
            loaded += chunkSize;

            let progress = loaded / args.size;
            progress = Math.round(progress * 100) / 100;
            if (progress != loading.progress) {
              this.getUserProgress(userId).progress = progress;
              this.holder.save();
            }
          });
          args.data.on('end', () => {
            let loading = this.getUserProgress(userId);
            loading.loading = false;
            loading.progress = 1;
            this.holder.save();
            resolve();
          });
        });
      })
      .then(() => {
        return this.table.pushCells({
          updRowCounter: true,
          values: {
            fileName: [ file ],
            origName: [ args.name ],
            ext: [ ext ],
            size: [ args.size + '' ],
            userId: [ userId ]
          }
        });
      })
    );
  }

  sendFile(args: SendFileArgs): Promise<any> {
    return Promise.reject(null);
  }

  static TYPE_ID = 'FilesContainer';
  static SERIALIZE: SERIALIZER = () => ({
    ...Base.SERIALIZE(),
    loading:        { type: 'json', userCtx: 'loadingUserMap' },
    loadingUserMap: { type: 'json', tags: [ 'sr' ] }
  })
}
