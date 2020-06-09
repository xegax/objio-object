import { VideoFileObject } from './video-file-object';
import { OBJIOItemClass, FileSystemSimple, getExt } from 'objio';
import { ImageFile } from './image-file';
import { DatabaseHolder } from './database/database-holder';
import { DatabaseTable } from './database/database-table';
import { FileStorage } from './file-storage';
import { ApprMapClientBase } from '../base/appr-map';
import { Youtube } from './youtube';
import { TaskBase } from 'objio/base/task';
import { TaskManagerBase } from 'objio/common/task-manager';
import { DataSourceHolder } from './datasource/data-source-holder';
import { NumericDataSource } from './datasource/numeric-source';
import { JSONDataSource } from './datasource/json-source';
import { ObjectBase } from '../view/config';
import { registerAll } from '../view/icon-map';

export function createFileObject(name: string) {
  const ext = getExt(name).toLowerCase();
  let obj: ObjectBase;

  if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext))
    obj = new ImageFile();

  if (['.mp4', '.mkv', '.avi', '.mov'].includes(ext))
    obj = new VideoFileObject();

  if (ext == '.json')
    obj = new DataSourceHolder({ dataSource: new JSONDataSource() });

  if (obj) {
    obj.setName(name);
  }

  return obj;
}

export function getClasses(): Array<OBJIOItemClass> {
  return [
    FileSystemSimple,
    DatabaseHolder,
    VideoFileObject,
    ImageFile,
    DatabaseTable,
    FileStorage,
    ApprMapClientBase,
    Youtube,
    DataSourceHolder,
    NumericDataSource,
    JSONDataSource,
    TaskBase,
    TaskManagerBase
  ];
}

registerAll();
