import { FileObjectBase, FileArgs, SendFileArgs } from '../base/file-object';
import { createWriteStream, unlinkSync, existsSync, lstatSync } from 'fs';
import { Readable } from 'stream';

export interface ServerSendFileArgs {
  name: string;
  size: number;
  mime: string;
  data: Readable;
}

export class FileObject extends FileObjectBase {
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
            unlinkSync(file);
        } catch (e) {
          console.log(e);
        }
        return Promise.resolve();
      },
      onLoad: () => {
        const file = obj.getPath();
        let size = 0;
        if (existsSync(file))
          size = lstatSync(file).size;
        
        if (obj.size != size) {
          obj.size = obj.loadSize = size;
          obj.holder.save();
        }
        return Promise.resolve();
      }
    });

    obj.holder.setMethodsToInvoke({
      'sendFile': {
        method: FileObject.getUploadFileImpl(obj),
        rights: 'write'
      }
    });
  }

  static getUploadFileImpl(obj: FileObject) {
    return (args: ServerSendFileArgs, userId: string) => {
      obj.setProgress(0);
      obj.setStatus('in progress');

      obj.origName = args.name;
      obj.size = args.size;
      obj.mime = args.mime;
      obj.loadSize = 0;
      obj.holder.save();

      let received = 0;
      return new Promise(resolve => {
        args.data.pipe(createWriteStream(obj.getPath()));
        args.data.on('data', chunk => {
          received += chunk.length;
          if (typeof chunk == 'string')
            obj.loadSize += chunk.length;
          else
            obj.loadSize += chunk.byteLength;

          obj.setProgress(obj.loadSize / obj.size);
        });
        args.data.on('end', () => {
          obj.onFileUploaded(userId).then(() => {
            obj.setStatus('ok');
            obj.setProgress(1);
            obj.holder.save();
            resolve(received);
          });
        });
      });
    };
  }

  static getPath(obj: FileObject, ext?: string) {
    return obj.holder.getPublicPath(obj.getFileName(ext));
  }

  onFileUploaded(userId: string) {
    return Promise.resolve();
  }

  getPath(ext?: string): string {
    return FileObject.getPath(this);
  }
}
