import { VideoConcatBase, OBJIDArgs, VideoFileBase } from '../base/video-concat';
import { lstatSync, existsSync, unlinkSync } from 'fs';
import { EncodeArgs, encodeFile, parseMedia } from '../task/ffmpeg';

export class VideoConcat extends VideoConcatBase {
  constructor() {
    super();

    this.holder.setMethodsToInvoke({
      append: {
        method: (args: OBJIDArgs) => this.append(args),
        rights: 'write'
      },
      execute: {
        method: (args: Object, userId: string) => this.execute(userId),
        rights: 'write'
      },
      remove: {
        method: (args: OBJIDArgs) => this.remove(args),
        rights: 'write'
      }
    });
  }

  onFileUploaded(): Promise<void> {
    return Promise.reject('not implemented');
  }

  append(args: OBJIDArgs): Promise<void> {
    return (
      this.holder.getObject<VideoFileBase>(args.id)
      .then(obj => {
        if (!(obj instanceof VideoFileBase))
          return Promise.reject(`object does not have correct type`);

        this.list.push(obj);
        this.list.holder.save();
      })
    );
  }

  remove(args: OBJIDArgs) {
    const idx = this.list.find(obj => obj.holder.getID() == args.id);
    if (idx == -1)
      return Promise.reject(`object id=${args.id} already was removed`);
    this.list.remove(idx);
    this.list.holder.save();

    return Promise.resolve();
  }

  execute(userId?: string): Promise<void> {
    if (this.isStatusInProgess())
      return Promise.reject('execute in progress');

    const outFile = this.getPath();
    existsSync(outFile) && unlinkSync(outFile);

    this.setProgress(0);
    this.setStatus('in progress');
    this.holder.save();

    const encArgs: EncodeArgs = {
      inFile: this.getList().map(file => file.getPath()),
      outFile,
      overwrite: true,
      onProgress: (p: number) => {
        try {
          this.size = this.loadSize = lstatSync(this.getPath()).size;
        } catch (e) {
          console.log(e);
        }

        p = Math.floor(p * 10) / 10;
        if (p == this.progress)
          return;

        this.progress = p;
        this.holder.save();
      }
    };

    return (
      this.holder.pushTask(() => encodeFile(encArgs), userId)
      .then(() => {
        this.size = this.loadSize = lstatSync(outFile).size;
        this.holder.save();
        return parseMedia(outFile);
      }).then(info => {
        this.progress = 0;
        this.setStatus('ok');
        this.holder.save();
      }).catch(e => {
        this.progress = 0;
        this.setStatus('error');
        this.holder.save();

        return Promise.reject(e);
      })
    );
  }
}