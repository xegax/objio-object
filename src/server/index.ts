import { OBJIOItemClass } from 'objio';
import { FileObject } from './file-object';
import { CSVTableFile, JSONTableFile } from './table-file';
import { VideoFileObject } from './video-file-object';
import { DocTable, Table } from './database';
import { FilesContainer } from './files-container';
import { SpriteSheet, Animation } from './sprite-sheet';
import { VideoConcat } from './video-concat';
import { ImageFile } from './image-file';

export function getClasses(): Array<OBJIOItemClass> {
  return [
    SpriteSheet,
    Animation,
    DocTable,
    FileObject,
    CSVTableFile,
    JSONTableFile,
    VideoFileObject,
    Table,
    FilesContainer,
    VideoConcat,
    ImageFile
  ];
}
