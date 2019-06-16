import { OBJIOItemClass } from 'objio';
import { FileObject } from './file-object';
import { CSVTableFile, JSONTableFile } from './table-file';
import { VideoFileObject } from './video-file-object';
import { SpriteSheet, Animation } from './sprite-sheet';
import { VideoConcat } from './video-concat';
import { ImageFile } from './image-file';
import { DatabaseHolder } from './database/database-holder';
import { DatabaseTable } from './database/database-table';
import { FileStorage } from './file-storage';
import { ApprMapServerBase } from '../base/appr-map';

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
    DatabaseTable,
    FileStorage,
    ApprMapServerBase
  ];
}
