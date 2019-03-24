import { ImageFileBase, SendFileArgs } from '../base/image-file';

export class ImageFile extends ImageFileBase {
  onFileUploaded() {
    return Promise.resolve();
  }
}
