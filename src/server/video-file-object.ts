import { parseMedia, encodeFile, parseStream, EncodeArgs, FileInfo } from '../task/ffmpeg';
import { lstatSync, existsSync, unlinkSync, readFileSync } from 'fs';
import { VideoFileBase, FilterArgs, FileId, AppendImageArgs, VideoFileExportData } from '../base/video-file';
import { getTimeFromSeconds } from '../common/time';
import { FileObject } from './file-object';
import { ImageFile, ImageFileBase } from './image-file';
import { OBJIOArray, OBJIOItem } from 'objio';

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
        method: (args: FileId, userId: string) => this.execute(args, userId),
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
      appendImage: {
        method: (args: AppendImageArgs, userId) => this.appendImage(args, userId),
        rights: 'write'
      },
      save: {
        method: (args: FilterArgs) => this.save(args),
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
      this.holder.save(true);
    });
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

  remove(args: FileId): Promise<void> {
    if (![this.files, this.images].some((arr: OBJIOArray<OBJIOItem>) => {
      const idx = arr.find(item => item.holder.getID() == args.id);
      if (idx != -1) {
        arr.remove(idx);
        arr.holder.save();
      }
      return idx != -1;
    })) {
      return Promise.reject(`file id=${args.id} not found`);
    }

    this.holder.save(true);
    return Promise.resolve();
  }

  execute(args: FileId, userId?: string): Promise<void> {
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
      return this.onVideoUploaded(userId, fileId);

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

  private onVideoUploaded(userId: string, fileId?: string): Promise<void> {
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
