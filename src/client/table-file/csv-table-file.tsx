import * as React from 'react';
import { CSVTableFile as Base } from '../../base/table-file/csv-table-file';
import { SendFileArgs } from '../../base/file-object';
import { PropsGroup } from 'ts-react-ui/prop-sheet/props-group';
import { TableFileView } from '../../view/table-file-view';
import { SwitchPropItem } from 'ts-react-ui/prop-sheet';

export class CSVTableFile extends Base {
  sendFile(args: SendFileArgs): Promise<any> {
    return this.holder.invokeMethod({
      method: 'send-file',
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
      <>
        <PropsGroup label='csv file config'>
          <SwitchPropItem
            label='First row has columns'
            value={this.isFirstRowIsCols()}
            onChanged={newValue => {
              this.setFirstRowIsCols(newValue);
              this.holder.save();
            }}
          />
        </PropsGroup>
        <PropsGroup label='columns'>
          <TableFileView model={this}/>
        </PropsGroup>
      </>
    );
  }
}
