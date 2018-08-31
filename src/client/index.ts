import { FileObject, FileArgs, getExt } from './file-object';
import { CSVFileObject } from './csv-file-object';
import { VideoFileObject } from './video-file-object';
import { StateObject } from './state-object';
import { SQLite3Table } from './sqlite3-table';
import { DocTable } from './doc-table';
import { OBJIOItemClass } from 'objio';

export function createFileObject(args: FileArgs): FileObject {
  const ext = getExt(args.name).toLowerCase();
  if (ext == '.mp4')
    return new VideoFileObject(args);

  if (ext == '.csv')
    return new CSVFileObject(args);

  return new FileObject(args);
}

export function getClasses(): Array<OBJIOItemClass> {
  return [
    SQLite3Table,
    DocTable,
    StateObject,
    FileObject,
    CSVFileObject,
    VideoFileObject
  ];
}
