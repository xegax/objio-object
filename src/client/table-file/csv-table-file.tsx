import * as React from 'react';
import { CSVTableFile as Base } from '../../base/table-file/csv-table-file';
import { TableFileProps } from '../../view/table-file-props';
import { SwitchPropItem } from 'ts-react-ui/prop-sheet';

export class CSVTableFile extends Base {
  getDataReader() {
    return null;
  }

  onFileUploaded(userId: string) {
    return Promise.resolve();
  }

  renderSpecificProps = () => {
    return (
      <>
        <SwitchPropItem
          label='First row has columns'
          value={this.isFirstRowIsCols()}
          onChanged={newValue => {
            this.setFirstRowIsCols(newValue);
            this.holder.save();
          }}
        />
      </>
    );
  }

  getObjPropGroups() {
    return (
      <TableFileProps
        model={this}
        renderSpecificProps={this.renderSpecificProps}
      />
    );
  }
}
