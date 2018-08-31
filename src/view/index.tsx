import * as React from 'react';
import { FileObject, FileObjectView, Props as FileViewProps } from './file-object-view';
import { CSVFileObject, CSVFileView, Props as CSVViewProps } from './csv-file-view';
import { VideoFileObject, VideoFileView, Props as VideoViewProps } from './video-file-view';
import { DocTable, DocTableView, DocTableConfig, Props as TableViewProps } from './doc-table-view';
import { ClientClass, ClientView, Props } from './config';
import { OBJIOItemClass } from 'objio';

interface RegisterArgs {
  classObj: OBJIOItemClass;
  views: Array<ClientView>;
  sources?: Array<OBJIOItemClass>;
  config?(props: Props): JSX.Element;
}

function registerViews(args: RegisterArgs) {
  (args.classObj as ClientClass).getClientViews = () => args.views;
  args.sources && ((args.classObj as ClientClass).getClassSources = () => args.sources);
  args.config && ((args.classObj as ClientClass).getClientConfig = args.config);
}

export function getViews(): Array<OBJIOItemClass & ClientClass> {
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
    sources: [ CSVFileObject ],
    config: props => <DocTableConfig {...props}/>
  });

  return [
    FileObject,
    CSVFileObject,
    VideoFileObject,
    DocTable
  ];
}
