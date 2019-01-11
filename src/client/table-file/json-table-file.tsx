import * as React from 'react';
import { JSONTableFile as Base } from '../../base/table-file/json-table-file';
import { SendFileArgs } from '../../base/file-object';
import { PropsGroup } from 'ts-react-ui/prop-sheet/props-group';
import { TableFileView } from '../../view/table-file-view';

export class JSONTableFile extends Base {
  sendFile(args: SendFileArgs): Promise<any> {
    return this.holder.invokeMethod({
      method: 'sendFile',
      args: args.file,
      onProgress: args.onProgress
    });
  }

  getDataReading() {
    return null;
  }

  onFileUploaded() {
    return Promise.resolve();
  }

  getObjPropGroups() {
    return (
      <PropsGroup label='columns'>
        <TableFileView model={this}/>
      </PropsGroup>
    );
  }
}
