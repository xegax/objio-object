import { parseFile, encodeFile } from '../task/ffmpeg';
import { lstatSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { VideoFileBase, SplitArgs, SplitId, Subfile } from '../base/video-file';
import { getTimeFromSeconds, getString } from '../common/time';
import { FileObject } from './file-object';

export class VideoFileObject extends VideoFileBase {
  constructor() {
    super();

    FileObject.initFileObj(this);

    this.holder.setMethodsToInvoke({
      ...this.holder.getMethodsToInvoke(),
      split: {
        method: (args: SplitArgs) => this.split(args),
        rights: 'write'
      },
      removeSplit: {
        method: (args: SplitId) => this.removeSplit(args),
        rights: 'write'
      }
    });
  }

  getSubfilesFolder() {
    const f = super.getSubfilesFolder();
    if (!existsSync(f))
      mkdirSync(f);
    return f;
  }

  removeSplit(args: SplitId): Promise<void> {
    try {
      const cut = this.findCutById(args.id);
      if (!cut)
        return Promise.reject(new Error(`file ${args.id} not found`));
      unlinkSync(this.getSubfilePath(cut));
    } catch (e) {
    }
    this.subfiles = this.subfiles.filter(cut => cut.id != args.id);
    this.holder.save();
    return Promise.resolve();
  }

  split(args: SplitArgs): Promise<void> {
    const from = getTimeFromSeconds(args.startSec);
    const to = getTimeFromSeconds(args.endSec);
    let newFile: Subfile = {
      name: 'crop-(' + getString(from) + '-' + getString(to) + ')',
      id: '' + Date.now(),
      desc: {},
      split: { ...args }
    };

    const outFile = this.getSubfilePath(newFile);
    this.setStatus('in progress');
    return (
      encodeFile({
        inFile: this.getPath(),
        outFile,
        range: { from, to },
        onProgress: (p: number) => {
          try {
            this.size = this.loadSize = lstatSync(this.getPath()).size;
          } catch (e) {
            console.log(e);
          }
          this.setProgress(p);
        }
      }).then(() => {
        this.size = this.loadSize = lstatSync(this.getPath()).size;
        return parseFile(this.getPath());
      }).then(info => {
        this.subfiles.push(newFile);
        this.setProgress(1);
        this.setStatus('ok');
        this.desc.duration = info.duration;
        this.holder.save();
      })
    );
  }

  onFileUploaded(): Promise<void> {
    return (
      parseFile(this.getPath())
      .then(info => {
        this.desc.duration = info.duration;
        this.holder.save();
      })
    );
  }

  sendFile() {
    return Promise.reject('not implemented');
  }
}
