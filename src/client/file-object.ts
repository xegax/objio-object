import { getExt } from '../common/common';
import { FileObjectBase, FileArgs } from '../base/file-object';

export { FileArgs, getExt };

export class FileObject extends FileObjectBase {
  onFileUploaded(userId: string): Promise<void> {
    return Promise.resolve();
  }
}
