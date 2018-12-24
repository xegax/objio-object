import { FileObjectBase, FileArgs, SendFileArgs } from '../base/file-object';
import { createWriteStream, unlinkSync, existsSync } from 'fs';
import { Readable } from 'stream';

interface ServerSendFileArgs {
  name: string;
  size: number;
  mime: string;
  data: Readable;
}

export abstract class FileObject extends FileObjectBase {
  constructor(args?: FileArgs) {
    super(args);

    FileObject.initFileObj(this);
  }

  sendFile(args: SendFileArgs): Promise<any> {
    return Promise.reject('not implemented');
  }

  static initFileObj(obj: FileObject) {
    obj.holder.addEventHandler({
      onDelete: () => {
        try {
          const file = obj.getPath();
          console.log('removing content file', file);
          if (existsSync(file))
            unlinkSync(obj.getPath());
        } catch (e) {
          console.log(e);
        }
        return Promise.resolve();
      }
    });

    obj.holder.setMethodsToInvoke({
      'send-file': {
        method: FileObject.getUploadFileImpl(obj),
        rights: 'write'
      }
    });
  }

  static getUploadFileImpl(obj: FileObject) {
    return (args: ServerSendFileArgs) => {
      obj.setProgress(0);
      obj.setStatus('in progress');

      obj.origName = args.name;
      obj.size = args.size;
      obj.mime = args.mime;
      obj.loadSize = 0;
      obj.holder.save();

      return new Promise(resolve => {
        args.data.pipe(createWriteStream(obj.getPath()));
        args.data.on('data', chunk => {
          if (typeof chunk == 'string')
            obj.loadSize += chunk.length;
          else
            obj.loadSize += chunk.byteLength;

          obj.setProgress(obj.loadSize / obj.size);
          obj.holder.save();
        });
        args.data.on('end', () => {
          obj.onFileUploaded().then(() => {
            obj.setStatus('ok');
            obj.setProgress(1);
            obj.holder.save();
            resolve();
          });
        });
      });
    }
  }

  static getPath(obj: FileObject) {
    return obj.holder.getPublicPath(obj.getFileName());
  }

  getPath(): string {
    return FileObject.getPath(this);
  }
}
