import { OBJIOItemClass } from 'objio';
import { FileObject } from './file-object';
import { CSVFileObject } from './csv-file-object';
import { VideoFileObject } from './video-file-object';
import { StateObject } from './state-object';

export function getClasses(): Array<OBJIOItemClass> {
  return [
    FileObject,
    CSVFileObject,
    VideoFileObject,
    StateObject
  ];
}
