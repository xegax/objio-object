import { FileObjectBase, FileArgs, SendFileArgs } from '../base/file-object';
import { createWriteStream, unlinkSync, existsSync, lstatSync } from 'fs';
import { Readable } from 'stream';

export interface ServerSendFileArgs {
  name: string;
  size: number;
  mime: string;
  fileId?: string;
  data: Readable;
  other?: string;
}

export class FileObject extends FileObjectBase {
  constructor(args?: FileArgs) {
    super(args);

    FileObject.initFileObj(this);
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
      },
      'removeContent': {
        method: () => FileObject.removeContent(obj),
        rights: 'write'
      }
    });
  }

  static removeContent(obj: FileObject) {
    const file = obj.getPath();
    if (existsSync(file))
      unlinkSync(file);
    return Promise.resolve();
  }

  static getUploadFileImpl(obj: FileObject) {
    return (args: ServerSendFileArgs, userId: string) => {
      obj.setProgress(0);
      obj.setStatus('in progress');

      if (!args.fileId) {
        obj.origName = args.name;
        obj.size = args.size;
        obj.mime = args.mime;
        obj.loadSize = 0;
        obj.holder.save();
      }

      let loadSize = 0;
      let received = 0;
      let ws = createWriteStream(obj.getPath(args.fileId));

      return new Promise(resolve => {
        args.data.pipe(ws);
        args.data.on('data', chunk => {
          received += chunk.length;
          if (typeof chunk == 'string')
            loadSize += chunk.length;
          else
            loadSize += chunk.byteLength;

          obj.setProgress(loadSize / args.size);
        });
        ws.on('close', () => {
          obj.onFileUploaded(userId, args.fileId)
          .then(() => {
            if (!args.fileId)
              obj.loadSize = loadSize;

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

  onFileUploaded(userId: string, fileId?: string) {
    return Promise.resolve();
  }

  getPath(ext?: string): string {
    return FileObject.getPath(this);
  }
}
