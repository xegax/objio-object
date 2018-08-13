import { FileObject as FileObjectBase, FileArgs } from '../file-object';
import { SERIALIZER } from 'objio';
import { createWriteStream, unlinkSync, existsSync } from 'fs';
import * as http from 'http';

export interface ServerFileObjectImpl {
  onFileUploaded?(): Promise<any>;
}

export class FileObject extends FileObjectBase {
  constructor(args?: FileArgs) {
    super(args);

    this.holder.addEventHandler({
      onDelete: () => {
        try {
          const file = this.getPath();
          console.log('removing content file', file);
          if (existsSync(file))
            unlinkSync(this.getPath());
        } catch(e) {
          console.log(e);
        }
        return Promise.resolve();
      }
    });

    this.holder.setMethodsToInvoke({
      'send-file': (args: {data: http.IncomingMessage}) => {
        return new Promise(resolve => {
          args.data.pipe(createWriteStream(this.getPath()));
          args.data.on('data', chunk => {
            if (typeof chunk == 'string')
              this.loadSize += chunk.length;
            else
              this.loadSize += chunk.byteLength;

            let progress = this.loadSize / this.impl.getSize();
            progress = Math.round(progress * 100) / 100;
            if (progress != this.progress)
              this.holder.save();
            this.progress = progress;
          });
          args.data.on('end', () => {
            if (this.getImpl<ServerFileObjectImpl>().onFileUploaded)
              this.getImpl<ServerFileObjectImpl>().onFileUploaded().then(resolve);
            else
              resolve();
          });
        });
      }
    });
  }

  getPath(): string {
    return this.holder.getFilePath(super.getPath());
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...FileObjectBase.SERIALIZE()
  })
}
