import { OBJIOItemClass } from 'objio';
import { FileObject } from './file-object';
import { CSVTableFile, JSONTableFile } from './table-file';
import { VideoFileObject } from './video-file-object';
import { SpriteSheet, Animation } from './sprite-sheet';
import { VideoConcat } from './video-concat';
import { ImageFile } from './image-file';
import { DatabaseHolder } from './database/database-holder';
import { Table2 } from './database/table2';
import { FileStorage } from './file-storage';

export function getClasses(): Array<OBJIOItemClass> {
  return [
    SpriteSheet,
    Animation,
    FileObject,
    CSVTableFile,
    JSONTableFile,
    VideoFileObject,
    VideoConcat,
    ImageFile,
    DatabaseHolder,
    Table2,
    FileStorage
  ];
}
