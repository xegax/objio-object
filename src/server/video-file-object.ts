import { FileObject as Base } from './file-object';
import { parseFile, encodeFile } from '../task/ffmpeg';
import { toString, Time } from '../task/time';
import { FileObject } from '../client/file-object';
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
      this.holder.getObject<FileObject>(args.parentId)
      .then(video => {
        this.state.setStateType('in progress');
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
            this.state.setProgress(p);
            this.holder.save();
          }
        }).then(() => {
          this.size = this.loadSize = lstatSync(this.getPath()).size;
          return parseFile(this.getPath());
        }).then(info => {
          this.state.setProgress(1);
          this.state.setStateType('valid');
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
    ...FileObject.SERIALIZE(),
    details:    { type: 'json' }
  })
}
