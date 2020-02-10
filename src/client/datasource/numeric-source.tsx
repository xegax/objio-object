import * as React from 'react';
import { NumericDataSourceClientBase } from '../../base/datasource/numeric-source';
import { ObjProps } from '../../base/object-base';
import { PropsGroup, TextPropItem } from 'ts-react-ui/prop-sheet';

export class NumericDataSource extends NumericDataSourceClientBase {
  getObjPropGroups(props: ObjProps) {
    return (
      <PropsGroup label='Configuration'>
        <TextPropItem
          label='Rows number'
          value={this.rows}
          onEnter={rows => {
            let rowNum = +rows;
            if (this.rows == rowNum || Number.isNaN(rowNum) || !Number.isFinite(rowNum))
              return '' + this.rows;

            this.setRowsNum(+rows);
          }}
        />
      </PropsGroup>
    );
  }
}
