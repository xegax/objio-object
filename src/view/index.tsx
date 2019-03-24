import * as React from 'react';
import { FileObject, FileObjectView, Props as FileViewProps } from './file-object-view';
import { JSONTableFile, CSVTableFile } from '../client/table-file';
import { VideoFileObject, VideoFileView, Props as VideoViewProps } from './video-file-view';
import { DocTable, DocTableView, DocTableConfig, DocTableProps } from './doc-table-view';
import { OBJIOItemClassViewable, registerViews } from './config';
import {
  FilesContainer,
  FilesContainerView,
  FilesContainerConfig,
  FilesContainerProps
} from './files-container-view';
import { Database } from '../client/database/database';
import { SpriteSheet, SpriteSheetView, SpriteConfig } from './sprite-sheet';
import 'ts-react-ui/typings';
import { Icon } from 'ts-react-ui/icon';
import * as CSVIcon from '../images/csv-icon.png';
import * as JSONIcon from '../images/json-icon.png';
import * as TableIcon from '../images/table-icon.png';
import * as MP4Icon from '../images/mp4-icon.png';
import { FileObjectBase } from '../base/file-object';
import { Project, ProjectView } from './project';
import { ServerInstanceView, ServerInstance } from './server-view';
import { VideoConcatView, VideoConcat, Props as VideoConcatProps } from './video-concat-view';
import { ImageFile } from '../client/image-file';

export { registerViews };

export function getViews(): Array<OBJIOItemClassViewable> {
  registerViews({
    classObj: FileObject,
    views: [{
      view: (props: FileViewProps) => <FileObjectView {...props}/>
    }]
  });

  registerViews({
    classObj: ImageFile,
    views: [{
      view: (props: FileViewProps) => <FileObjectView {...props}/>
    }]
  });

  registerViews({
    classObj: CSVTableFile,
    icons: { item: <Icon src={CSVIcon}/> },
    views: []
  });

  registerViews({
    classObj: JSONTableFile,
    icons: { item: <Icon src={JSONIcon}/> },
    views: []
  });

  registerViews({
    classObj: VideoFileObject,
    icons: { item: <Icon src={MP4Icon}/> },
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
    classObj: DocTable,
    icons: { item: <Icon src={TableIcon}/> },
    views: [{
      view: (props: DocTableProps) => <DocTableView {...props}/>
    }],
    sources: [ [ CSVTableFile, Database ], [JSONTableFile, Database] ],
    config: props => <DocTableConfig {...props}/>,
    flags: ['create-wizard'],
    desc: 'Database table'
  });

  registerViews({
    classObj: FilesContainer,
    views: [{
      view: (props: FilesContainerProps) => <FilesContainerView {...props}/>
    }],
    config: props => <FilesContainerConfig {...props}/>,
    flags: ['create-wizard'],
    desc: 'Files container object',
    sources: [ [ Database ] ]
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

  return [
    Project,
    FilesContainer,
    FileObject,
    CSVTableFile,
    JSONTableFile,
    VideoFileObject,
    DocTable,
    SpriteSheet,
    VideoConcat,
    ImageFile
  ];
}
