import * as React from 'react';
import { FileObject, FileObjectView, Props as FileViewProps } from './file-object-view';
import { CSVFileObject, CSVFileView, Props as CSVViewProps } from './csv-file-view';
import { VideoFileObject, VideoFileView, Props as VideoViewProps } from './video-file-view';
import { DocTable, DocTableView, DocTableConfig, Props as TableViewProps } from './doc-table-view';
import { ClientClass, ViewDesc, ViewDescFlags } from './config';
import { OBJIOItemClass } from 'objio';

interface RegisterArgs extends Partial<ViewDesc> {
  classObj: OBJIOItemClass;
}

function registerViews(args: RegisterArgs) {
  const cc = args.classObj as ClientClass;
  const flags = Array.isArray(args.flags || []) ? new Set(args.flags) : args.flags;
  cc.getViewDesc = (): ViewDesc => {
    return {
      flags,
      desc: args.desc || args.classObj.TYPE_ID,
      views: args.views,
      config: args.config,
      sources: args.sources
    };
  };
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
    config: props => <DocTableConfig {...props}/>,
    flags: ['create-wizard']
  });

  return [
    FileObject,
    CSVFileObject,
    VideoFileObject,
    DocTable
  ];
}
