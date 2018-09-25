import { FileObject, FileArgs, getExt } from './file-object';
import { CSVFileObject } from './csv-file-object';
import { VideoFileObject } from './video-file-object';
import { DocTable } from './doc-table';
import { Table } from './table';
import { OBJIOItemClass } from 'objio';
import { FilesContainer } from './files-container';
import { ServerInstance } from 'objio/client/server-instance';
import { User } from 'objio/client/User';
import { UserGroup } from 'objio/client/user-group';

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
    User,
    UserGroup,
    ServerInstance,
    Table,
    DocTable,
    FileObject,
    CSVFileObject,
    VideoFileObject,
    FilesContainer
  ];
}
