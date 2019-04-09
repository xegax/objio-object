import * as React from 'react';
import { CSVTableFile as Base } from '../../base/table-file/csv-table-file';
import { TableFileView } from '../../view/table-file-view';
import { SwitchPropItem, PropItem, PropsGroup } from 'ts-react-ui/prop-sheet';

export class CSVTableFile extends Base {
  getDataReading() {
    return null;
  }

  onFileUploaded(userId: string) {
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
