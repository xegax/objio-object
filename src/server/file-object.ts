import { FileObject as FileObjectBase, FileArgs } from '../file-object';
import { SERIALIZER } from 'objio';
import { createWriteStream } from 'fs';
import * as http from 'http';

export class FileObject extends FileObjectBase {
  constructor(args?: FileArgs) {
    super(args);

    this.holder.setMethodsToInvoke({
      'send-file': (args: {data: http.IncomingMessage}) => {
        return new Promise(resolve => {
          args.data.pipe(createWriteStream(this.getPath()));
          args.data.on('data', chunk => {
            if (typeof chunk == 'string')
              this.loadSize += chunk.length;
            else
              this.loadSize += chunk.byteLength;

            let progress = this.loadSize / this.originSize;
            progress = Math.round(progress * 100) / 100;
            if (progress != this.progress)
              this.holder.save();
            this.progress = progress;
          });
          args.data.on('end', resolve);
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
