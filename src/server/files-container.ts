import { SERIALIZER } from 'objio';
import { getExt } from '../client/file-object';
import { Table } from './table';
import { ColumnAttr } from '../client/table';
import { FilesContainer as Base } from '../client/files-container';
import * as http from 'http';
import * as fs from 'fs';
import { createWriteStream } from 'fs';

function getColumns(): Array<ColumnAttr> {
  return [
    {
      name: 'origName',
      type: 'TEXT'
    }, {
      name: 'ext',
      type: 'TEXT'
    }, {
      name: 'size',
      type: 'INTEGER'
    }, {
      name: 'fileName',
      type: 'TEXT'
    }
  ];
}

export class FilesContainer extends Base {
  constructor() {
    super();

    this.holder.addEventHandler({
      onCreate: this.onCreate
    });

    this.holder.setMethodsToInvoke({
      'send-file': this.sendFileImpl
    });
  }

  onCreate = () => {
    let table = new Table({ source: this.database });
    return (
      this.holder.createObject(table)
      .then(() => {
        fs.mkdirSync(this.holder.getFilePath(this.getDirPath()));
        this.table = table;
        this.holder.save();
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

  sendFileImpl = (args: { name: string, size: number, mime: string, data: http.IncomingMessage }) => {
    const ext = getExt(args.name);
    const file = this.generateFileName(ext);
    return (
      this.table.pushCells({
        updRowCounter: true,
        values: {
          fileName: [ file ],
          origName: [ args.name ],
          ext: [ ext ],
          size: [ args.size + '' ]
        }
      })
      .then(() => {
        return new Promise(resolve => {
          args.data.pipe(createWriteStream( this.getPath(file) ));
          args.data.on('data', chunk => {
            let chunkSize = 0;
            if (typeof chunk == 'string')
              chunkSize = chunk.length;
            else
              chunkSize = chunk.byteLength;
    
            this.holder.save();
          });
          args.data.on('end', () => {
            this.holder.save();
            resolve();
          });
        });
      })
    );
  }

  sendFile(file: File): Promise<any> {
    return Promise.reject(null);
  }

  static TYPE_ID = 'FilesContainer';
  static SERIALIZE: SERIALIZER = () => ({
    ...Base.SERIALIZE()
  })
}
