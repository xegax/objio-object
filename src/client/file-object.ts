import { FileObjectBase, SendFileArgs, FileArgs, getExt } from '../base/file-object';

export { FileArgs, getExt };

export class FileObject extends FileObjectBase {
  sendFile(args: SendFileArgs): Promise<any> {
    return this.holder.invokeMethod({ method: 'sendFile', args: args.file, onProgress: args.onProgress });
  }

  onFileUploaded(userId: string): Promise<void> {
    return Promise.resolve();
  }
}
