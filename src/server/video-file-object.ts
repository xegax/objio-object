import { parseFile, encodeFile, parseStream, EncodeArgs } from '../task/ffmpeg';
import { lstatSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { VideoFileBase, ExecuteArgs, SplitId, Subfile } from '../base/video-file';
import { getTimeFromSeconds, getString } from '../common/time';
import { FileObject } from './file-object';

export class VideoFileObject extends VideoFileBase {
  constructor() {
    super();

    FileObject.initFileObj(this);

    this.holder.setMethodsToInvoke({
      ...this.holder.getMethodsToInvoke(),
      split: {
        method: (args: ExecuteArgs) => this.execute(args),
        rights: 'write'
      },
      removeSplit: {
        method: (args: SplitId) => this.removeSplit(args),
        rights: 'write'
      },
      updateDescription: {
        method: () => this.updateDesciption(),
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

  updateDesciption(): Promise<void> {
    return parseFile(this.getPath())
    .then(info => {
      this.desc.streamArr = info.stream.map(parseStream);
      this.holder.save();
    });
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

  execute(args: ExecuteArgs): Promise<void> {
    let newFile: Subfile = {
      name: 'cut-' + Date.now(),
      id: '' + Date.now(),
      desc: { streamArr: [] },
      execArgs: { ...args }
    };
    const outFile = this.getSubfilePath(newFile);

    const encArgs: EncodeArgs = {
      inFile: this.getPath(),
      outFile,
      onProgress: (p: number) => {
        try {
          this.size = this.loadSize = lstatSync(this.getPath()).size;
        } catch (e) {
          console.log(e);
        }
        this.setProgress(p);
      }
    };

    if (args.timeCut) {
      encArgs.range = {
        from: getTimeFromSeconds(args.timeCut.startSec),
        to: getTimeFromSeconds(args.timeCut.endSec)
      };
    }

    if (args.frameCut)
      encArgs.crop = { ...args.frameCut };

    this.setStatus('in progress');
    return (
      encodeFile(encArgs).then(() => {
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
        this.desc.streamArr = info.stream.map(parseStream);
        this.desc.duration = info.duration;
        this.holder.save();
      })
    );
  }

  sendFile() {
    return Promise.reject('not implemented');
  }
}
