import { OBJIOItemClass } from 'objio';
import { FileObject } from './file-object';
import { CSVTableFile, JSONTableFile } from './table-file';
import { VideoFileObject } from './video-file-object';
import { DocTable } from './doc-table';
import { Table } from './table';
import { FilesContainer } from './files-container';
import { SpriteSheet, Animation } from './sprite-sheet';

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
    FilesContainer
  ];
}
