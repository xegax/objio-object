import { FileObject, FileArgs, getExt } from './file-object';
import { CSVTableFile, JSONTableFile } from './table-file';
import { VideoFileObject } from './video-file-object';
import { OBJIOItemClass } from 'objio';
import { Animation, SpriteSheet } from './sprite-sheet';
import { VideoConcat } from './video-concat';
import { ImageFile } from './image-file';
import { DatabaseHolder } from './database/database-holder';
import { DatabaseTable } from './database/database-table';
import { FileStorage } from './file-storage';
import { ApprMapClientBase } from '../base/appr-map';
import { Youtube } from './youtube';

export function createFileObject(args: FileArgs): FileObject {
  const ext = getExt(args.name).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif'].indexOf(ext) != -1)
    return new ImageFile(args);

  if (['.mp4', '.mkv', '.avi', '.mov'].indexOf(ext) != -1)
    return new VideoFileObject(args);

  if (ext == '.csv')
    return new CSVTableFile(args);

  if (ext == '.json')
    return new JSONTableFile(args);

  return new FileObject(args);
}

export function getClasses(): Array<OBJIOItemClass> {
  return [
    Animation,
    SpriteSheet,
    DatabaseHolder,
    FileObject,
    CSVTableFile,
    JSONTableFile,
    VideoFileObject,
    VideoConcat,
    ImageFile,
    DatabaseTable,
    FileStorage,
    ApprMapClientBase,
    Youtube
  ];
}
