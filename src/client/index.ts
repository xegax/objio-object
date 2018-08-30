import { FileObject, FileArgs, getExt } from './file-object';
import { CSVFileObject } from './csv-file-object';
import { VideoFileObject } from './video-file-object';
import { ClientClass } from './client-class';
import { StateObject } from '../client/state-object';
import { Table } from './table';

export function createFileObject(args: FileArgs): FileObject {
  const ext = getExt(args.name).toLowerCase();
  if (ext == '.mp4')
    return new VideoFileObject(args);

  if (ext == '.csv')
    return new CSVFileObject(args);

  return new FileObject(args);
}

export function getClasses(): Array<ClientClass> {
  return [
    Table,
    StateObject,
    FileObject,
    CSVFileObject,
    VideoFileObject
  ];
}
