import { FileObjectBase, SendFileArgs, FileArgs, getExt } from '../base/file-object';

export { FileArgs, getExt };

export class FileObject extends FileObjectBase {
  onFileUploaded(userId: string): Promise<void> {
    return Promise.resolve();
  }
}
