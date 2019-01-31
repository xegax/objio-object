import { parseFile, encodeFile, parseStream, EncodeArgs } from '../task/ffmpeg';
import { lstatSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { VideoFileBase, ExecuteArgs, CutId, Subfile } from '../base/video-file';
import { getTimeFromSeconds } from '../common/time';
import { FileObject } from './file-object';

let parallelTasks = Array< Promise<any> >();
let taskQueue: Array<{
  runner: () => Promise<void>,
  resolve: (res: any) => void,
  reject: (res: any) => void
}> = [];

function pushTask<T>(runner: () => Promise<any>): Promise<T> {
  return new Promise((resolve, reject) => {
    taskQueue.push({ runner, resolve, reject });
    runParallel();
  });
}

function runParallel() {
  if (!taskQueue.length)
    return;

  while (taskQueue.length && parallelTasks.length < 3) {
    let taskArr = taskQueue.splice(0, 1);
    let p = taskArr[0].runner();
    p.then(taskArr[0].resolve);
    p.catch(taskArr[0].reject);
    p.finally(() => {
      parallelTasks.splice(parallelTasks.indexOf(p), 1);
      runParallel();
    });

    parallelTasks.push(p);
  }

  console.log('parallel tasks', parallelTasks.length);
}

export class VideoFileObject extends VideoFileBase {
  constructor() {
    super();

    FileObject.initFileObj(this);

    this.holder.setMethodsToInvoke({
      ...this.holder.getMethodsToInvoke(),
      execute: {
        method: (args: ExecuteArgs) => this.execute(args),
        rights: 'write'
      },
      removeSplit: {
        method: (args: CutId) => this.removeSplit(args),
        rights: 'write'
      },
      updateDescription: {
        method: () => this.updateDesciption(),
        rights: 'write'
      },
      append: {
        method: (args: ExecuteArgs) => this.append(args),
        rights: 'write'
      },
      save: {
        method: (args: ExecuteArgs) => this.save(args),
        rights: 'write'
      }
    });
  }

  save(args: ExecuteArgs) {
    const cut = this.findCutById(args.id);
    if (!cut)
      return Promise.reject('invalid cut');

    cut.filter = args.filter || cut.filter;
    cut.name = args.name || cut.name;
    this.holder.save();
    return Promise.resolve();
  }

  append(args: ExecuteArgs) {
    let newFile: Subfile = {
      name: 'cut-' + Date.now(),
      id: '' + Date.now(),
      desc: { streamArr: [] },
      filter: { ...args.filter }
    };

    this.subfiles.push(newFile);
    this.holder.save();
    return Promise.resolve();
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

  removeSplit(args: CutId): Promise<void> {
    try {
      const cut = this.findCutById(args.id);
      if (cut.progress)
        return Promise.reject('please wait to finish execute');

      if (!cut)
        return Promise.reject(`file ${args.id} not found`);
      const path = this.getSubfilePath(cut);
      existsSync(path) && unlinkSync(path);
    } catch (e) {
    }
    this.subfiles = this.subfiles.filter(cut => cut.id != args.id);
    this.holder.save();
    return Promise.resolve();
  }

  execute(args: ExecuteArgs): Promise<void> {
    const cut = this.findCutById(args.id);
    if (!cut)
      return Promise.reject('cut id is invalid');

    if (cut.progress != null)
      return Promise.reject('cut already in progress');

    const outFile = this.getSubfilePath(cut);
    existsSync(outFile) && unlinkSync(outFile);

    cut.progress = 0;
    this.holder.save();

    const encArgs: EncodeArgs = {
      inFile: this.getPath(),
      outFile,
      onProgress: (p: number) => {
        try {
          this.size = this.loadSize = lstatSync(this.getPath()).size;
        } catch (e) {
          console.log(e);
        }

        p = Math.floor(p * 10) / 10;
        if (p == cut.progress)
          return;

        cut.progress = p;
        this.holder.save();
      }
    };

    if (args.filter.cut) {
      encArgs.range = {
        from: getTimeFromSeconds(args.filter.cut.startSec),
        to: getTimeFromSeconds(args.filter.cut.endSec)
      };
    }

    if (args.filter.crop)
      encArgs.crop = { ...args.filter.crop };

    return (
      pushTask(() => encodeFile(encArgs))
      .then(() => {
        this.size = this.loadSize = lstatSync(this.getPath()).size;
        return parseFile(this.getPath());
      }).then(info => {
        delete cut.progress;
        cut.executed = true;
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
