import { FileObject, FileArgs, getExt } from './file-object';
import { CSVFileObject } from './csv-file-object';
import { JSONFileObject } from './json-file-object';
import { VideoFileObject } from './video-file-object';
import { DocTable } from './doc-table';
import { Table } from './table';
import { OBJIOItemClass } from 'objio';
import { FilesContainer } from './files-container';
import { ServerInstance } from 'objio/object/client/server-instance';
import { UserObject } from 'objio/object/client/user-object';
import { UserGroup } from 'objio/object/client/user-group';

export function createFileObject(args: FileArgs): FileObject {
  const ext = getExt(args.name).toLowerCase();
  if (ext == '.mp4')
    return new VideoFileObject(args);

  if (ext == '.csv')
    return new CSVFileObject(args);

  if (ext == '.json')
    return new JSONFileObject(args);

  return new FileObject(args);
}

export function getClasses(): Array<OBJIOItemClass> {
  return [
    UserObject,
    UserGroup,
    ServerInstance,
    Table,
    DocTable,
    FileObject,
    CSVFileObject,
    JSONFileObject,
    VideoFileObject,
    FilesContainer
  ];
}
