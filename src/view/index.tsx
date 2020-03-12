import * as React from 'react';
import { VideoFileObject, VideoFileView, Props as VideoViewProps } from './video-file-view';
import { OBJIOItemClassViewable, registerViews } from './config';
import { DatabaseHolder, DatabaseHolderView } from './database-holder-view';
import 'ts-react-ui/typings';
import { Project, ProjectView } from './project';
import { ServerInstanceView, ServerInstance } from './server-view';
import { ImageFile } from '../client/image-file';
import { ObjectToCreate } from '../common/interfaces';
import { DatabaseTable, DatabaseTableView } from '../view/database-table';
export { registerViews };
import { FileStorage, FileStorageView, Props as FileStorageViewProps } from './file-storage';
import { Youtube, YoutubeView, YTProps }  from '../view/youtube';
import { ObjectBaseView } from './object-base';
import { ObjectBase } from '../base/object-base';
import { DataSourceHolder } from '../client/datasource/data-source-holder';
import { NumericDataSource } from '../client/datasource/numeric-source';
import { DatasourceHolderView } from './datasource-holder';

export function getObjectsToCreate(): Array<ObjectToCreate> {
  return [
    {
      name: 'Table',
      desc: 'Table object',
      icon: 'table-icon',
      create: () => new DatabaseTable()
    }, {
      name: 'File storage',
      desc: 'Files storage',
      icon: 'fs-icon',
      create: () => new FileStorage()
    }, {
      name: 'Youtube',
      desc: 'Youtube',
      create: () => new Youtube()
    }, {
      name: 'Numeric Source',
      desc: 'Numeric Source',
      create: () => new DataSourceHolder({
        dataSource: new NumericDataSource()
      })
    }
  ];
}

export function getViews(): Array<OBJIOItemClassViewable> {
  registerViews({
    classObj: DataSourceHolder,
    views: [{
      view: (props: { model: DataSourceHolder }) => <DatasourceHolderView {...props}/>
    }]
  });

  registerViews({
    classObj: Youtube,
    views: [{
      view: (props: YTProps) => <YoutubeView {...props}/>
    }]
  });

  registerViews({
    classObj: FileStorage,
    views: [{
      view: (props: FileStorageViewProps) => <FileStorageView {...props}/>
    }]
  });

  registerViews({
    classObj: ImageFile,
    views: [{
      view: (props: { model: ObjectBase }) => <ObjectBaseView {...props}/>
    }]
  });

  registerViews({
    classObj: VideoFileObject,
    views: [{
      view: (props: VideoViewProps) => <VideoFileView {...props}/>
    }]
  });

  registerViews({
    classObj: Project,
    views: [{
      view: (props: { model: Project }) => <ProjectView {...props}/>
    }]
  });

  registerViews({
    classObj: ServerInstance,
    views: [{
      view: (props: {model: ServerInstance}) => <ServerInstanceView {...props}/>
    }]
  });

  registerViews({
    classObj: DatabaseHolder,
    views: [{
      view: (props: {model: DatabaseHolder}) => <DatabaseHolderView {...props}/>
    }]
  });

  registerViews({
    classObj: DatabaseTable,
    views: [{
      view: (props: {model: DatabaseTable, objects: any}) => <DatabaseTableView {...props}/>
    }]
  });

  return [
    Project,
    VideoFileObject,
    ImageFile,
    DatabaseHolder,
    DatabaseTable,
    FileStorage,
    Youtube,
    DataSourceHolder
  ];
}
