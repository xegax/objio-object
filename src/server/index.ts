import { OBJIOItemClass } from 'objio';
import { FileSystemSimple } from 'objio/server';
import { VideoFileObject, VideoFileTask } from './video-file-object';
import { ImageFile } from './image-file';
import { DatabaseHolder } from './database/database-holder';
import { DatabaseTable } from './database/database-table';
import { FileStorage } from './file-storage';
import { ApprMapServerBase } from '../base/appr-map';
import { Youtube } from './youtube';
import { DataSourceHolder } from './datasource/data-source-holder';
import { NumericDataSource } from './datasource/numeric-source';
import { JSONDataSource } from './datasource/json-source';

export function getClasses(): Array<OBJIOItemClass> {
  return [
    FileSystemSimple,
    VideoFileObject,
    VideoFileTask,
    ImageFile,
    DatabaseHolder,
    DatabaseTable,
    FileStorage,
    ApprMapServerBase,
    Youtube,
    DataSourceHolder,
    NumericDataSource,
    JSONDataSource
  ];
}
