import { ImageFileBase, SendFileArgs } from '../base/image-file';

export class ImageFile extends ImageFileBase {
  sendFile(args: SendFileArgs): Promise<any> {
    return this.holder.invokeMethod({
      method: 'sendFile',
      args: args.file,
      onProgress: args.onProgress
    });
  }

  onFileUploaded() {
    return Promise.resolve();
  }
}
