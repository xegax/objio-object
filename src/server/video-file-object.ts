import { parseMedia, encodeFile, parseStream, EncodeArgs, FileInfo } from '../task/ffmpeg';
import { existsSync, unlinkSync } from 'fs';
import {
  VideoFileBase,
  FilterArgs,
  SaveArgs,
  RemoveArgs,
  AppendImageArgs,
  VideoFileExportData
} from '../base/video-file';
import { getTimeFromSeconds } from '../common/time';
import { ImageFile } from './image-file';
import { OBJIOArray, getExt } from 'objio';
import { FileSystemSimple } from 'objio/server';
import { ObjectBase } from '../view/config';
import { TaskServerBase } from 'objio/server/task';

export class VideoFileObject extends VideoFileBase {
  protected fs: FileSystemSimple;

  constructor(filter?: FilterArgs) {
    super();
    this.fs = new FileSystemSimple();

    this.holder.addEventHandler({
      onCreate: this.onInit,
      onLoad: this.onInit
    });

    this.holder.setMethodsToInvoke({
      ...this.holder.getMethodsToInvoke(),
      execute: {
        method: (args: RemoveArgs, userId: string) => this.execute(args, userId),
        rights: 'write'
      },
      remove: {
        method: (args: RemoveArgs) => this.remove(args),
        rights: 'write'
      },
      updateDescription: {
        method: () => this.updateDesciption(),
        rights: 'write'
      },
      append: {
        method: (args: FilterArgs, userId) => this.append(args, userId),
        rights: 'write'
      },
      appendImage: {
        method: (args: AppendImageArgs, userId) => this.appendImage(args, userId),
        rights: 'write'
      },
      save: {
        method: (args: SaveArgs, userId) => this.save(args, userId),
        rights: 'write'
      },
      export: {
        method: () => this.export(),
        rights: 'read'
      }
    });

    this.filter = filter || {};
  }

  private onInit = () => {
    this.setStatus('ok');
    this.fs.holder.addEventHandler({
      onUpload: args => {
        this.onVideoUploaded(args);
      }
    });

    return Promise.resolve();
  }

  export(): Promise<VideoFileExportData> {
    const data: VideoFileExportData = {
      cuts: []
    };

    this.files.getArray().forEach(file => {
      data.cuts.push({
        filter: {...file.getFilter()},
        name: file.getName()
      });
    });

    return Promise.resolve( data );
  }

  save(args: SaveArgs, userId?: string) {
    const currFrom = (this.filter.trim || { from: 0 }).from;
    const nextFrom = (args.trim || { from: 0 }).from;
    const timeChanged = currFrom != nextFrom;
    const cropChanged = JSON.stringify(this.filter.crop || {}) != JSON.stringify(args.crop || {});
    const flipChanged = this.filter.hflip != args.hflip || this.filter.vflip != args.vflip;
    this.filter = {...args};
    this.holder.save();

    if (timeChanged || cropChanged || flipChanged) {
      return (
        this.holder.getObject<VideoFileObject>(args.sourceId)
        .then(source => {
          return this.updatePreview(source, userId);
        })
        .then(() => {})
      );
    }

    return Promise.resolve();
  }

  private updatePreview(source: VideoFileObject, userId?: string) {
    return new Promise<void>(resolve => {
      const time = (this.filter.trim || { from: 0 }).from;
      const outFile = this.fs.getPathForNew('preview-128', '.jpg');

      const encArgs: EncodeArgs = {
        inFile: [ source.getPath('content') ],
        outFile,
        overwrite: true
      };

      const frame = source.getFrameSize();
      if (this.filter.crop) {
        frame.width = this.filter.crop.width;
        frame.height = this.filter.crop.height;
        encArgs.crop = this.filter.crop;
      }
      encArgs.range = { from: getTimeFromSeconds(time) };
      encArgs.resize = { width: Math.round((128 * frame.width) / frame.height) , height: 128 };
      encArgs.vframes = 1;

      this.holder.pushTask(new VideoFileTask(encArgs, 'Preview'), userId)
      .then(() => {
        this.fs.updateFiles({ 'preview-128': outFile });
        return this.holder.save(true);
      }).then(resolve);
    });
  }

  append(args: FilterArgs, userId?: string) {
    const obj = new VideoFileObject({...args});
    return (
      this.holder.createObject(obj)
      .then(() => {
        obj.setName(`cut-${Date.now()}`);
        this.files.push(obj);
        this.files.holder.save();
        this.holder.save(true);
      })
      .then(() => {
        return obj.updatePreview(this, userId);
      })
    );
  }

  appendImage(args: AppendImageArgs, userId?: string) {
    let img = new ImageFile();
    const fs = img.getFS();
    return this.holder.createObject(img)
    .then(() => {
      const outFile = fs.getPathForNew('content', '.jpg');
      const encArgs: EncodeArgs = {
        inFile: [ this.getPath('content') ],
        outFile,
        overwrite: true
      };

      encArgs.range = { from: getTimeFromSeconds(args.time) };
      encArgs.resize = args.resize;
      encArgs.crop = args.crop;
      encArgs.vframes = 1;

      return (
        this.holder.pushTask(new VideoFileTask(encArgs, 'Image'), userId)
        .then(() => fs.updateFiles({ 'content': outFile }))
      );
    })
    .then(() => {
      const outFile = fs.getPathForNew('preview-128', '.jpg');
      const encArgs: EncodeArgs = {
        inFile: [ this.getPath('content') ],
        outFile,
        overwrite: true
      };

      const frame = this.getFrameSize();
      encArgs.range = { from: getTimeFromSeconds(args.time) };
      encArgs.resize = { width: Math.round((128 * frame.width) / frame.height) , height: 128 };
      encArgs.crop = args.crop;
      encArgs.vframes = 1;
      return (
        this.holder.pushTask(new VideoFileTask(encArgs, 'Preview'), userId)
        .then(() => fs.updateFiles({ 'preview-128': outFile }))
      );
    })
    .then(() => parseMedia(img.getPath('content')))
    .then(info => {
      const strm = info.stream.map(parseStream);
      const v = strm.find(v => !!v.video);
      if (!v)
        return Promise.reject('parse failed');

      img.setDesc({
        width: v.video.width,
        height: v.video.height,
        codec: v.video.codec,
        pixelFmt: v.video.pixelFmt
      });

      img.setName(`image-${args.time}`);
      img.holder.save();

      this.images.push(img);
      this.images.holder.save();
      this.holder.save();
    }).catch(e => {
      return Promise.reject(e);
    });
  }

  updateDesciption(): Promise<void> {
    return parseMedia(this.getPath('content'))
    .then(info => {
      this.desc.streamArr = info.stream.map(parseStream);
      this.holder.save();
    });
  }

  remove(args: RemoveArgs): Promise<void> {
    if (![this.files, this.images].some((arr: OBJIOArray<ObjectBase>) => {
      const idx = arr.find(item => item.holder.getID() == args.objId);
      if (idx == -1)
        return false;

      arr.remove(idx);
      arr.holder.save();
      return true;
    })) {
      return Promise.reject(`file id=${args.objId} not found`);
    }

    this.holder.save(true);
    return Promise.resolve();
  }

  execute(args: RemoveArgs, userId?: string): Promise<void> {
    const file = this.findFile(args.objId) as VideoFileObject;
    if (!file)
      return Promise.reject(`file id=${args.objId} not found!`);

    if (file.isStatusInProgess())
      return Promise.reject('execute in progress');

    const outfs = (file.getFS() as FileSystemSimple);
    const outFile = file.getFS().getPathForNew('content', '.mp4');
    existsSync(outFile) && unlinkSync(outFile);

    file.setProgress(0);
    file.setStatus('in progress');
    file.executeStartTime = Date.now();
    file.executeTime = 0;
    file.holder.save();

    const encArgs: EncodeArgs = {
      inFile: [ this.getPath('content') ],
      outFile,
      overwrite: true
    };

    if (file.filter.trim) {
      encArgs.range = {
        from: getTimeFromSeconds(file.filter.trim.from),
        to: getTimeFromSeconds(file.filter.trim.to)
      };
    }

    if (file.filter.crop)
      encArgs.crop = { ...file.filter.crop };

    if (file.filter.reverse)
      encArgs.reverse = file.filter.reverse;

    if (file.filter.resize)
      encArgs.resize = {...file.filter.resize};

    if (file.filter.fps)
      encArgs.fps = file.filter.fps;

    file.filter.vflip && (encArgs.vflip = true);
    file.filter.hflip && (encArgs.hflip = true);
    file.filter.noaudio && (encArgs.noaudio = true);
    file.filter.stabilize && (encArgs.stabilize = true);
    if (file.filter.preset)
      encArgs.preset = file.filter.preset;

    const v = this.desc.streamArr.find(s => !!s.video);
    if (v) {
      const inputFPS = file.filter.speed * v.video.fps;
      if (!Number.isNaN(inputFPS) && Number.isFinite(inputFPS))
        encArgs.inputFPS = inputFPS;
    }

    const task = new VideoFileTask(encArgs, `Encode ${this.getName()}`);
    task.holder.subscribe(() => {
      try {
        outfs.updateFiles({ 'content': outFile });
      } catch (e) {
        console.log(e);
      }

      file.progress = task.getProgress();
      file.holder.save();
    }, 'save');
    return (
      this.holder.pushTask(task, userId)
      .then(() => {
        outfs.updateFiles({ 'content': outFile });
        file.holder.save();
        return parseMedia(outFile);
      }).then(info => {
        file.executeTime = Date.now() - file.executeStartTime;
        file.progress = 0;
        file.setStatus('ok');
        file.desc.streamArr = info.stream.map(parseStream);
        file.desc.duration = info.duration;
        file.holder.save();
        this.holder.save(true);
      }).catch(e => {
        file.executeTime = Date.now() - file.executeStartTime;
        file.progress = 0;
        file.setStatus('error');
        file.holder.save();
        this.holder.save(true);

        return Promise.reject(e);
      })
    );
  }

  private onVideoUploaded = (args: { userId: string }): Promise<void> => {
    const path = this.fs.getPath('content');
    let p = (
      parseMedia(path)
      .then(info => {
        this.desc.streamArr = info.stream.map(parseStream);
        this.desc.duration = info.duration;
        this.holder.save();

        if (['.avi', '.mkv'].includes( getExt(path).toLocaleLowerCase() )) {
          const v = this.desc.streamArr.find(s => s.video != null);
          const a = this.desc.streamArr.find(s => s.audio != null);

          let eargs: EncodeArgs = {
            inFile: [this.getPath('content')],
            outFile: this.getPath('.mp4'),
            overwrite: true,
            codecV: v && v.video.codec.startsWith('h264') ? 'copy' : 'h264',
            codecA: a && ['mp3', 'aac'].some(codec => a.audio.codec.startsWith(codec)) ? 'copy' : 'mp3',
            onProgress: (p: number) => {
              this.setProgress(p);
            }
          };

          this.setProgress(0);
          this.setStatus('in progress');
          return (
            this.holder.pushTask(new VideoFileTask(eargs, 'Video info'), args.userId)
            .then(() => {
              this.setStatus('ok');
              this.setProgress(1);

              this.holder.save();
              return parseMedia(this.getPath('content'));
            })
            .then(info => {
              this.desc.streamArr = info.stream.map(parseStream);
              this.desc.duration = info.duration;
              this.holder.save();

              unlinkSync(eargs.inFile[0]);
            })
          );
        }
      })
      .catch((err: string) => {
        this.addError(err);
      })
    );

    return Promise.resolve();
  }
}

export class VideoFileTask extends TaskServerBase {
  private args: EncodeArgs;

  constructor(args: EncodeArgs, name: string) {
    super();

    this.args = {
      ...args,
      onProgress: t => {
        args.onProgress && args.onProgress(t);
        this.setProgress(t);
        this.save();
      }
    };
    this.name = name;
  }

  protected runImpl() {
    return Promise.resolve({
      task: encodeFile(this.args).then(() => {})
    });
  }

  protected stopImpl(): Promise<void> {
    return Promise.reject('Method not implemented.');
  }

  protected pauseImpl(): Promise<void> {
    return Promise.reject('Method not implemented.');
  }

  protected resumeImpl(): Promise<void> {
    return Promise.reject('Method not implemented.');
  }
}
