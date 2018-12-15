import { FileObjectBase, FileArgs, SendFileArgs } from '../base/file-object';
import { createWriteStream, unlinkSync, existsSync } from 'fs';
import { Readable } from 'stream';

interface ServerSendFileArgs {
  name: string;
  size: number;
  mime: string;
  data: Readable;
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
        } catch (e) {
          console.log(e);
        }
        return Promise.resolve();
      }
    });

    this.holder.setMethodsToInvoke({
      'send-file': {
        method: this.sendFileImpl,
        rights: 'write'
      }
    });
  }

  sendFile(args: SendFileArgs): Promise<any> {
    return Promise.reject('not implemented');
  }

  private sendFileImpl = (args: ServerSendFileArgs): Promise<void> => {
    this.setProgress(0);
    this.setStatus('in progress');

    this.origName = args.name;
    this.size = args.size;
    this.mime = args.mime;
    this.loadSize = 0;
    this.holder.save();

    return new Promise(resolve => {
      args.data.pipe(createWriteStream(this.getPath()));
      args.data.on('data', chunk => {
        if (typeof chunk == 'string')
          this.loadSize += chunk.length;
        else
          this.loadSize += chunk.byteLength;

        this.setProgress(this.loadSize / this.size);
        this.holder.save();
      });
      args.data.on('end', () => {
        this.onFileUploaded().then(() => {
          this.setStatus('ok');
          this.setProgress(1);
          this.holder.save();
          resolve();
        });
      });
    });
  }

  onFileUploaded(): Promise<void> {
    return Promise.resolve();
  }

  getPath(): string {
    return this.holder.getPublicPath(super.getFileName());
  }
}
