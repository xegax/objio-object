import { FileObjectBase, SendFileArgs, FileArgs, getExt } from '../base/file-object';

export { FileArgs, getExt };

export class FileObject extends FileObjectBase {
  sendFile(args: SendFileArgs): Promise<any> {
    return this.holder.invokeMethod({ method: 'send-file', args: args.file, onProgress: args.onProgress });
  }

  onFileUploaded(): Promise<void> {
    return Promise.resolve();
  }
}
