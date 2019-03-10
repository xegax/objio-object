import { parseMedia, encodeFile, parseStream, EncodeArgs } from '../task/ffmpeg';
import { lstatSync, existsSync, unlinkSync, promises} from 'fs';
import { VideoFileBase, FilterArgs, FileId } from '../base/video-file';
import { getTimeFromSeconds } from '../common/time';
import { FileObject } from './file-object';

export class VideoFileObject extends VideoFileBase {
  constructor(filter?: FilterArgs) {
    super();

    FileObject.initFileObj(this);

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
    return parseMedia(this.getPath())
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
      }).catch(e => {
        file.executeTime = Date.now() - file.executeStartTime;
        file.progress = 0;
        file.setStatus('error');
        file.holder.save();

        return Promise.reject(e);
      })
    );
  }

  onFileUploaded(userId: string): Promise<void> {
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

  sendFile() {
    return Promise.reject('not implemented');
  }
}
