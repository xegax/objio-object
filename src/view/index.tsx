import * as React from 'react';
import { FileObject, FileObjectView, Props as FileViewProps } from './file-object-view';
import { JSONTableFile, CSVTableFile } from '../client/table-file';
import { VideoFileObject, VideoFileView, Props as VideoViewProps } from './video-file-view';
import { OBJIOItemClassViewable, registerViews } from './config';
import { DatabaseHolder, DatabaseHolderView } from './database-holder-view';
import { SpriteSheet, SpriteSheetView, SpriteConfig } from './sprite-sheet';
import 'ts-react-ui/typings';
import { Icon } from 'ts-react-ui/icon';
import * as CSVIcon from '../images/csv-file-type.svg';
import * as JSONIcon from '../images/json-file-type.svg';
import * as FSIcon from '../images/file-storage.svg';
import * as TableIcon from '../images/table.svg';
import * as DatabaseIcon from '../images/database.svg';
import * as MP4Icon from '../images/mp4.svg';
import * as ImageIcon from '../images/image.svg';
import { FileObjectBase } from '../base/file-object';
import { Project, ProjectView } from './project';
import { ServerInstanceView, ServerInstance } from './server-view';
import { VideoConcatView, VideoConcat, Props as VideoConcatProps } from './video-concat-view';
import { ImageFile } from '../client/image-file';
import { ObjectToCreate } from '../common/interfaces';
import { DatabaseTable, DatabaseTableView } from '../view/database-table';
export { registerViews };
import { FileStorage, FileStorageView, Props as FileStorageViewProps } from './file-storage';
import { Youtube, YoutubeView, YTProps }  from '../view/youtube';
import { IconSVG } from 'ts-react-ui/icon-svg';

export function getObjectsToCreate(): Array<ObjectToCreate> {
  return [
    {
      name: 'sprite-sheet',
      desc: 'Sprite sheet object',
      create: () => new SpriteSheet()
    }, {
      name: 'table',
      desc: 'table object',
      icon: <Icon src={TableIcon}/>,
      create: () => new DatabaseTable()
    }, {
      name: 'file-storage',
      desc: 'files storage',
      icon: <IconSVG icon={FSIcon}/>,
      create: () => new FileStorage()
    }, {
      name: 'youtube',
      desc: 'youtube',
      create: () => new Youtube()
    }
  ];
}

export function getViews(): Array<OBJIOItemClassViewable> {
  registerViews({
    classObj: Youtube,
    views: [{
      view: (props: YTProps) => <YoutubeView {...props}/>
    }]
  });

  registerViews({
    classObj: FileStorage,
    icons: { item: <IconSVG icon={FSIcon} /> },
    views: [{
      view: (props: FileStorageViewProps) => <FileStorageView {...props}/>
    }]
  });

  registerViews({
    classObj: FileObject,
    views: [{
      view: (props: FileViewProps) => <FileObjectView {...props}/>
    }]
  });

  registerViews({
    classObj: ImageFile,
    icons: { item: <IconSVG icon={ImageIcon}/> },
    views: [{
      view: (props: FileViewProps) => <FileObjectView {...props}/>
    }]
  });

  registerViews({
    classObj: CSVTableFile,
    icons: { item: <IconSVG icon={CSVIcon}/> },
    views: [{
      view: () => null
    }]
  });

  registerViews({
    classObj: JSONTableFile,
    icons: { item: <IconSVG icon={JSONIcon}/> },
    views: [{
      view: () => null
    }]
  });

  registerViews({
    classObj: VideoFileObject,
    icons: { item: <IconSVG icon={MP4Icon}/> },
    views: [{
      view: (props: VideoViewProps) => <VideoFileView {...props}/>
    }]
  });

  registerViews({
    classObj: VideoConcat,
    views: [{
      view: (props: VideoConcatProps) => <VideoConcatView {...props}/>
    }],
    flags: ['create-wizard'],
    desc: 'Video concatenation'
  });

  registerViews({
    classObj: SpriteSheet,
    views: [{
      view: (props: {model: SpriteSheet}) => <SpriteSheetView key={props.model.holder.getID()} {...props} />
    }],
    config: props => <SpriteConfig {...props}/>,
    sources: [ [ FileObjectBase ] ],
    flags:  [ 'create-wizard' ],
    desc: 'Sprite sheet object'
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
    icons: { item: <IconSVG icon={DatabaseIcon}/> },
    views: [{
      view: (props: {model: DatabaseHolder}) => <DatabaseHolderView {...props}/>
    }]
  });

  registerViews({
    classObj: DatabaseTable,
    icons: { item: <IconSVG icon={TableIcon}/> },
    views: [{
      view: (props: {model: DatabaseTable, objects: any}) => <DatabaseTableView {...props}/>
    }]
  });

  return [
    Project,
    FileObject,
    CSVTableFile,
    JSONTableFile,
    VideoFileObject,
    SpriteSheet,
    VideoConcat,
    ImageFile,
    DatabaseHolder,
    DatabaseTable,
    FileStorage,
    Youtube
  ];
}
