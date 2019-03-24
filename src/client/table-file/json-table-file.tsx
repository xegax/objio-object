import * as React from 'react';
import { JSONTableFile as Base } from '../../base/table-file/json-table-file';
import { SendFileArgs } from '../../base/file-object';
import { PropsGroup, PropItem } from 'ts-react-ui/prop-sheet';
import { TableFileView } from '../../view/table-file-view';

export class JSONTableFile extends Base {
  getDataReading() {
    return null;
  }

  onFileUploaded() {
    return Promise.resolve();
  }

  getObjPropGroups() {
    return (
      <>
      <PropsGroup label='rows'>
        <PropItem label='rows' value={this.getRows()}/>
      </PropsGroup>
      <PropsGroup label='columns'>
        <TableFileView model={this}/>
      </PropsGroup>
      </>
    );
  }
}
