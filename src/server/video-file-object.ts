import { parseMedia, encodeFile, parseStream, EncodeArgs, FileInfo } from '../task/ffmpeg';
import { lstatSync, existsSync, unlinkSync, readFileSync } from 'fs';
import { VideoFileBase, FilterArgs, SaveArgs, RemoveArgs, AppendImageArgs, VideoFileExportData } from '../base/video-file';
import { getTimeFromSeconds } from '../common/time';
import { FileObject } from './file-object';
import { ImageFile, ImageFileBase } from './image-file';
import { OBJIOArray } from 'objio';

export class VideoFileObject extends VideoFileBase {
  constructor(filter?: FilterArgs) {
    super();

    FileObject.initFileObj(this);

    this.holder.addEventHandler({
      onLoad: () => {
        this.setStatus('ok');
        if (this.images)
          return Promise.resolve();

        let images = new OBJIOArray<ImageFileBase>();
        return (
          this.holder.createObject(images)
          .then(() => {
            this.images = images;
            this.holder.save();
          })
        );
      }
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
    const timeChanged = (this.filter.trim || { from: -1 }).from != (args.trim || { from: -1 }).from;
    const cropChanged = JSON.stringify(this.filter.crop || {}) != JSON.stringify(args.crop || {});
    const flipChanged = this.filter.hflip != args.hflip || this.filter.vflip != args.vflip;
    this.filter = {...args};
    this.holder.save();

    if (timeChanged || cropChanged || flipChanged) {
      return (
        this.holder.getObject<VideoFileObject>(args.sourceId)
        .then(source => {
          return this.updatePreview(source, this.filter.trim.from, userId);
        })
        .then(() => {})
      )
    };

    return Promise.resolve();
  }

  private updatePreview(source: VideoFileObject, time: number, userId?: string) {
    return new Promise(resolve => {
      const outFile = this.getPath('.preview-128.jpg');
      const encArgs: EncodeArgs = {
        inFile: [ source.getPath() ],
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

      this.holder.pushTask<FileInfo>(() => encodeFile(encArgs), userId)
      .then(() => {
        return this.holder.save(true);
      }).then(resolve);
    });
  }

  append(args: FilterArgs, userId?: string) {
    const obj = new VideoFileObject({...args});
    const from = (args.trim || { from: 0 }).from;
    return this.holder.createObject(obj)
    .then(() => {
      obj.origName = this.origName;
      obj.mime = this.mime;
      obj.setName(`cut-${Date.now()}`);
      this.files.push(obj);
      this.files.holder.save();
      this.holder.save(true);
    })
    .then(() => {
      return obj.updatePreview(this, from, userId);
    })
    .then(() => {});
  }

  appendImage(args: AppendImageArgs, userId?: string) {
    let obj = new ImageFile({
      name: this.origName + '.jpg',
      mime: 'image/jpeg',
      size: 0
    });

    return this.holder.createObject(obj)
    .then(() => {
      const outFile = obj.getPath();
      const encArgs: EncodeArgs = {
        inFile: [ this.getPath() ],
        outFile,
        overwrite: true
      };

      encArgs.range = { from: getTimeFromSeconds(args.time) };
      encArgs.resize = args.resize;
      encArgs.crop = args.crop;
      encArgs.vframes = 1;

      return this.holder.pushTask<FileInfo>(() => encodeFile(encArgs), userId);
    })
    .then(() => {
      const outFile = obj.getPath('.preview-128.jpg');
      const encArgs: EncodeArgs = {
        inFile: [ this.getPath() ],
        outFile,
        overwrite: true
      };

      const frame = this.getFrameSize();
      encArgs.range = { from: getTimeFromSeconds(args.time) };
      encArgs.resize = { width: Math.round((128 * frame.width) / frame.height) , height: 128 };
      encArgs.crop = args.crop;
      encArgs.vframes = 1;
      return this.holder.pushTask<FileInfo>(() => encodeFile(encArgs), userId);
    })
    .then(() => parseMedia(obj.getPath()))
    .then(info => {
      const strm = info.stream.map(parseStream);
      const v = strm.find(v => !!v.video);
      if (!v)
        return Promise.reject('parse failed');

      obj.setDesc({
        width: v.video.width,
        height: v.video.height,
        codec: v.video.codec,
        pixelFmt: v.video.pixelFmt
      });

      obj.setName(`image-${args.time}`);
      obj.holder.save();

      this.images.push(obj);
      this.images.holder.save();
      this.holder.save();
    }).catch(e => {
      return Promise.reject(e);
    });
  }

  updateDesciption(): Promise<void> {
    return parseMedia(this.getPath())
    .then(info => {
      this.desc.streamArr = info.stream.map(parseStream);
      this.holder.save();
    });
  }

  remove(args: RemoveArgs): Promise<void> {
    if (![this.files, this.images].some((arr: OBJIOArray<FileObject>) => {
      const idx = arr.find(item => item.holder.getID() == args.objId);
      if (idx != -1) {
        const obj = arr.get(idx);
        if (args.removeContent)
          FileObject.removeContent(obj);

        arr.remove(idx);
        arr.holder.save();
      }
      return idx != -1;
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

    const outFile = file.getPath();
    existsSync(outFile) && unlinkSync(outFile);

    file.setProgress(0);
    file.setStatus('in progress');
    file.executeStartTime = Date.now();
    file.executeTime = 0;
    file.holder.save();

    const encArgs: EncodeArgs = {
      inFile: [this.getPath()],
      outFile,
      overwrite: true,
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

    if (file.filter.reverse)
      encArgs.reverse = file.filter.reverse;

    if (file.filter.resize)
      encArgs.resize = {...file.filter.resize};

    if (file.filter.fps)
      encArgs.fps = file.filter.fps;

    file.filter.vflip && (encArgs.vflip = true);
    file.filter.hflip && (encArgs.hflip = true);
    file.filter.noaudio && (encArgs.noaudio = true);

    const v = this.desc.streamArr.find(s => !!s.video);
    if (v) {
      const inputFPS = file.filter.speed * v.video.fps;
      if (!Number.isNaN(inputFPS) && Number.isFinite(inputFPS))
        encArgs.inputFPS = inputFPS;
    }

    return (
      this.holder.pushTask(() => encodeFile(encArgs), userId)
      .then(() => {
        file.size = file.loadSize = lstatSync(outFile).size;
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

  onFileUploaded(userId: string, fileId?: string): Promise<void> {
    if (!fileId)
      return this.onVideoUploaded(userId);

    if (fileId == '.import') {
      this.onImportUploaded(userId, fileId);

      return Promise.resolve();
    }

    return Promise.reject(`invalid fileId = ${fileId}`);
  }

  private onImportUploaded(userId: string, fileId: string): Promise<void> {
    const json = readFileSync(this.getPath('.import')).toString();
    const filter: VideoFileExportData = JSON.parse(json);
    const cuts = filter.cuts.map(cut => {
      const video = new VideoFileObject(cut.filter);
      video.origName = this.origName;
      video.mime = this.mime;
      video.setName(cut.name);
      return video;
    });

    
    Promise.all( cuts.map(cut => this.holder.createObject<VideoFileBase>(cut)) )
    .then(() => {
      while(this.files.getLength())
        this.files.remove(0);

      cuts.forEach(v => this.files.push(v));
      this.files.holder.save();
      this.holder.save();
    });

    return Promise.resolve();
  }

  private onVideoUploaded(userId: string): Promise<void> {
    let p = (
      parseMedia(this.getPath())
      .then(info => {
        this.desc.streamArr = info.stream.map(parseStream);
        this.desc.duration = info.duration;
        this.holder.save();

        if (['.avi', '.mkv'].indexOf(this.getExt().toLocaleLowerCase()) != -1) {
          const v = this.desc.streamArr.find(s => s.video != null);
          const a = this.desc.streamArr.find(s => s.audio != null);

          let args: EncodeArgs = {
            inFile: [this.getPath()],
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
            this.holder.pushTask( () => encodeFile(args), userId )
            .then(() => {
              this.setStatus('ok');
              this.setProgress(1);
              this.origName = this.getOriginName('.mp4');
              this.holder.save();
              return parseMedia(this.getPath());
            })
            .then(info => {
              this.desc.streamArr = info.stream.map(parseStream);
              this.desc.duration = info.duration;
              this.holder.save();

              unlinkSync(args.inFile[0]);
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
