import { FileObject, FileArgs, getExt } from './file-object';
import { CSVTableFile, JSONTableFile } from './table-file';
import { VideoFileObject } from './video-file-object';
import { Table, DocTable } from './database';
import { OBJIOItemClass } from 'objio';
import { FilesContainer } from './files-container';
import { Animation, SpriteSheet } from './sprite-sheet';
import { VideoConcat } from './video-concat';

export function createFileObject(args: FileArgs): FileObject {
  const ext = getExt(args.name).toLowerCase();
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
    Table,
    DocTable,
    FileObject,
    CSVTableFile,
    JSONTableFile,
    VideoFileObject,
    FilesContainer,
    VideoConcat
  ];
}
