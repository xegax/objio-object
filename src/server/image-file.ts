import { ImageFileBase } from '../base/image-file';
import { parseMedia, parseStream } from '../task/ffmpeg';
import { FileSystemSimple } from 'objio/server';

export { ImageFileBase };

export class ImageFile extends ImageFileBase {
  protected fs: FileSystemSimple;

  constructor() {
    super();
    this.fs = new FileSystemSimple();

    this.holder.addEventHandler({
      onCreate: this.onInit,
      onLoad: this.onInit
    });
  }

  private onInit = () => {
    this.fs.holder.addEventHandler({ onUpload: this.onUpload });
    return Promise.resolve();
  }

  getFS() {
    return this.fs;
  }

  private onUpload = () => {
    parseMedia(this.getPath('content'))
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
  }
}
