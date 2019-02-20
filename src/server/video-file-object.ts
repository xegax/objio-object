import { parseFile, encodeFile, parseStream, EncodeArgs } from '../task/ffmpeg';
import { lstatSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { VideoFileBase, FilterArgs, ExecuteArgs, FileId, Subfile } from '../base/video-file';
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
  constructor(filter?: FilterArgs) {
    super();

    FileObject.initFileObj(this);

    this.holder.setMethodsToInvoke({
      ...this.holder.getMethodsToInvoke(),
      execute: {
        method: (args: FileId) => this.execute(args),
        rights: 'write'
      },
      remove: {
        method: (args: FileId) => this.remove(args),
        rights: 'write'
      },
      updateDescription: {
        method: () => this.updateDesciption(),
        rights: 'write'
      },
      append: {
        method: (args: FilterArgs) => this.append(args),
        rights: 'write'
      },
      save: {
        method: (args: FilterArgs) => this.save(args),
        rights: 'write'
      }
    });

    this.filter = filter || {};
  }

  save(args: FilterArgs) {
    this.filter = {...args};
    this.holder.save();
    return Promise.resolve();
  }

  append(args: FilterArgs) {
    let obj = new VideoFileObject({...args});
    return this.holder.createObject(obj)
    .then(() => {
      obj.origName = this.origName;
      obj.mime = this.mime;
      obj.setName(`cut-${Date.now()}`);
      this.files.push(obj);
      this.files.holder.save();
      this.holder.save();
    });
  }

  updateDesciption(): Promise<void> {
    return parseFile(this.getPath())
    .then(info => {
      this.desc.streamArr = info.stream.map(parseStream);
      this.holder.save();
    });
  }

  remove(args: FileId): Promise<void> {
    const idx = this.files.find(item => item.holder.getID() == args.id);
    if (idx == -1)
      return Promise.reject(`file id=${args.id} not found`);

    this.files.remove(idx);
    this.files.holder.save();
    return Promise.resolve();
  }

  execute(args: FileId): Promise<void> {
    const file = this.findFile(args.id) as VideoFileObject;
    if (!file)
      return Promise.reject(`file id=${args.id} not found!`);

    if (file.isStatusInProgess())
      return Promise.reject('execute in progress');

    const outFile = file.getPath();
    existsSync(outFile) && unlinkSync(outFile);

    file.setProgress(0);
    file.setStatus('in progress');
    file.executeStartTime = Date.now();
    file.executeTime = 0;
    file.holder.save();

    const encArgs: EncodeArgs = {
      inFile: this.getPath(),
      outFile,
      onProgress: (p: number) => {
        try {
          file.size = file.loadSize = lstatSync(file.getPath()).size;
        } catch (e) {
          console.log(e);
        }

        p = Math.floor(p * 10) / 10;
        if (p == file.progress)
          return;

        file.progress = p;
        file.holder.save();
      }
    };

    if (file.filter.trim) {
      encArgs.range = {
        from: getTimeFromSeconds(file.filter.trim.from),
        to: getTimeFromSeconds(file.filter.trim.to)
      };
    }

    if (file.filter.crop)
      encArgs.crop = { ...file.filter.crop };

    return (
      pushTask(() => encodeFile(encArgs))
      .then(() => {
        file.size = file.loadSize = lstatSync(outFile).size;
        file.holder.save();
        return parseFile(outFile);
      }).then(info => {
        file.executeTime = Date.now() - file.executeStartTime;
        file.progress = 0;
        file.setStatus('ok');
        file.desc.streamArr = info.stream.map(parseStream);
        file.desc.duration = info.duration;
        file.holder.save();
      }).catch(e => {
        file.executeTime = Date.now() - file.executeStartTime;
        file.progress = 0;
        file.setStatus('error');
        file.holder.save();
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
