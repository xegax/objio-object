import * as React from 'react';
import { JSONTableFile as Base } from '../../base/table-file/json-table-file';
import { PropsGroup, PropItem } from 'ts-react-ui/prop-sheet';
import { TableFileProps } from '../../view/table-file-props';

export class JSONTableFile extends Base {
  getDataReader() {
    return null;
  }

  onFileUploaded() {
    return Promise.resolve();
  }

  getObjPropGroups() {
    return (
      <TableFileProps
        model={this}
      />
    );
  }
}
