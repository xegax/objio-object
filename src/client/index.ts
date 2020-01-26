import { CSVTableFile, JSONTableFile } from './table-file';
import { VideoFileObject } from './video-file-object';
import { OBJIOItemClass, FileSystemSimple } from 'objio';
import { ImageFile } from './image-file';
import { DatabaseHolder } from './database/database-holder';
import { DatabaseTable } from './database/database-table';
import { FileStorage } from './file-storage';
import { ApprMapClientBase } from '../base/appr-map';
import { Youtube } from './youtube';
import { getExt } from 'objio';

export function createFileObject(name: string) {
  const ext = getExt(name).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif'].indexOf(ext) != -1)
    return new ImageFile();

  if (['.mp4', '.mkv', '.avi', '.mov'].indexOf(ext) != -1)
    return new VideoFileObject();

  if (ext == '.csv')
    return new CSVTableFile();

  if (ext == '.json')
    return new JSONTableFile();

  return null;
}

export function getClasses(): Array<OBJIOItemClass> {
  return [
    FileSystemSimple,
    DatabaseHolder,
    CSVTableFile,
    JSONTableFile,
    VideoFileObject,
    ImageFile,
    DatabaseTable,
    FileStorage,
    ApprMapClientBase,
    Youtube
  ];
}
