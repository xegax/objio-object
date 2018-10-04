import * as React from 'react';
import { FileObject, FileObjectView, Props as FileViewProps } from './file-object-view';
import { CSVFileObject, CSVFileView, Props as CSVViewProps } from './csv-file-view';
import { VideoFileObject, VideoFileView, Props as VideoViewProps } from './video-file-view';
import { DocTable, DocTableView, DocTableConfig, Props as TableViewProps } from './doc-table-view';
import { OBJIOItemClassViewable, registerViews } from './config';
import {
  FilesContainer,
  FilesContainerView,
  FilesContainerConfig,
  FilesContainerProps
} from './files-container-view';
import { Database } from '../client/database';
import { ServerInstanceView, ServerInstance, ServerInstProps } from './server-instance-view';

export function getViews(): Array<OBJIOItemClassViewable> {
  registerViews({
    classObj: FileObject,
    views: [{
      view: (props: FileViewProps) => <FileObjectView {...props}/>
    }]
  });

  registerViews({
    classObj: CSVFileObject,
    views: [{
      view: (props: CSVViewProps) => <CSVFileView {...props}/>
    }]
  });

  registerViews({
    classObj: VideoFileObject,
    views: [{
      view: (props: VideoViewProps) => <VideoFileView {...props}/>
    }]
  });

  registerViews({
    classObj: DocTable,
    views: [{
      view: (props: TableViewProps) => <DocTableView {...props}/>
    }],
    sources: [ [ CSVFileObject, Database ] ],
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
    classObj: ServerInstance,
    views: [{
      view: (props: ServerInstProps) => <ServerInstanceView {...props}/>
    }]
  });

  return [
    ServerInstance,
    FilesContainer,
    FileObject,
    CSVFileObject,
    VideoFileObject,
    DocTable
  ];
}
