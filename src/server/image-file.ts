import { ImageFileBase, FileArgs } from '../base/image-file';
import { FileObject } from './file-object';
import { parseMedia, parseStream } from '../task/ffmpeg';

export { ImageFileBase };

export class ImageFile extends ImageFileBase {
  constructor(args: FileArgs) {
    super(args);

    FileObject.initFileObj(this);
  }

  onFileUploaded(userId: string): Promise<void> {
    parseMedia(this.getPath())
    .then(info => {
      const parsed = info.stream.map(parseStream);
      const vi = parsed.findIndex(v => !!v.video);
      if (vi == -1)
        return Promise.reject('parse image description failed');

      const video = parsed[vi].video;
      this.desc.width = video.width;
      this.desc.height = video.height;
      this.desc.codec = video.codec;
      this.desc.pixelFmt = video.pixelFmt;
      this.holder.save();
    }).catch(err => {
      this.addError(err);
    });

    return Promise.resolve();
  }
}
