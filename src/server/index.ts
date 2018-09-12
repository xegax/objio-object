import { OBJIOItemClass } from 'objio';
import { FileObject } from './file-object';
import { CSVFileObject } from './csv-file-object';
import { VideoFileObject } from './video-file-object';
import { DocTable } from './doc-table';
import { Table } from './table';
import { FilesContainer } from './files-container';

export function getClasses(): Array<OBJIOItemClass> {
  return [
    DocTable,
    FileObject,
    CSVFileObject,
    VideoFileObject,
    Table,
    FilesContainer
  ];
}
