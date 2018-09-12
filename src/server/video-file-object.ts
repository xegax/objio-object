import { FileObject as Base } from './file-object';
import { parseFile, encodeFile } from '../task/ffmpeg';
import { toString, Time } from '../task/time';
import { lstatSync } from 'fs';
import { VideoFileDetails } from '../client/video-file-object';
import { SERIALIZER } from 'objio';

export class VideoFileObject extends Base {
  protected details: Partial<VideoFileDetails> = {};

  constructor(args) {
    super(args);

    this.holder.setMethodsToInvoke({
      ...this.holder.getMethodsToInvoke(),
      split: this.split
    });
  }

  split = (args: {from: Time, to: Time, parentId: string}): Promise<void> => {
    return (
      this.holder.getObject<Base>(args.parentId)
      .then(video => {
        this.setStatus('in progress');
        encodeFile({
          inFile: video.getPath(),
          outFile: this.getPath(),
          range: args,
          onProgress: (p: number) => {
            try {
              this.size = this.loadSize = lstatSync(this.getPath()).size;
            } catch (e) {
              console.log(e);
            }
            this.setProgress(p);
            this.holder.save();
          }
        }).then(() => {
          this.size = this.loadSize = lstatSync(this.getPath()).size;
          return parseFile(this.getPath());
        }).then(info => {
          this.setProgress(1);
          this.setStatus('ok');
          this.details.duration = toString(info.duration);
          this.holder.save();
        });
      })
      .catch(err => {
        console.log(err);
      })
    );
  }

  onFileUploaded(): Promise<void> {
    console.log('start parse');
    return (
      parseFile(this.getPath())
      .then(info => {
        console.log('parsed');
        this.details.duration = toString(info.duration);
        this.holder.save();
      })
    );
  }

  static TYPE_ID = 'VideoFileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...Base.SERIALIZE(),
    details:    { type: 'json' }
  })
}
