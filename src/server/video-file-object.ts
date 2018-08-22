import {
  VideoFileObject as VideoFileObjectBase
} from '../video-file-object';
import { ServerFileObjectImpl } from './file-object';
import { parseFile, encodeFile } from '../task/ffmpeg';
import { toString, Time } from '../task/time';
import { FileObject } from '../file-object';
import { lstatSync } from 'fs';

export class VideoFileObject extends VideoFileObjectBase implements ServerFileObjectImpl {
  constructor(args) {
    super(args);

    this.holder.setMethodsToInvoke({
      split: this.split
    });
  }

  split = (args: {from: Time, to: Time, parentId: string}): Promise<void> => {
    return (
      this.holder.getObject<FileObject>(args.parentId)
      .then(video => {
        encodeFile({
          inFile: this.holder.getFilePath(video.getImpl().getPath()),
          outFile: this.holder.getFilePath(this.getPath()),
          range: args,
          onProgress: (p: number) => {
            console.log(p);
            this.progress = p;
            try {
              this.originSize = lstatSync(this.holder.getFilePath(this.getPath())).size;
            } catch(e) {
              console.log(e);
            }
            this.holder.delayedNotify({type: 'progress'});
            this.holder.save();
          }
        }).then(() => {
          this.progress = 1;
          this.holder.delayedNotify({type: 'progress'});
          this.originSize = lstatSync(this.holder.getFilePath(this.getPath())).size;
          return parseFile(this.holder.getFilePath(this.getPath()))
        }).then(info => {
          this.holder.delayedNotify({type: 'progress'});
          this.duration = toString(info.duration);
          this.holder.save();
        });
      })
      .catch(err => {
        console.log(err);
      })
    );
  }

  onFileUploaded(): Promise<any> {
    return (
      parseFile(this.holder.getFilePath(this.getPath()))
      .then(info => {
        this.duration = toString(info.duration);
        this.holder.save();
      })
    );
  }
}
