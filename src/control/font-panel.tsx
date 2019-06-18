import * as React from 'react';
import {
  Button,
  ButtonGroup
} from 'ts-react-ui/blueprint';
import { TableColumnAppr } from '../base/database/database-table-appr';
import { DropDown } from 'ts-react-ui/drop-down';
import { getFontList, FontAppr } from '../base/appr-decl';

interface Props {
  defaultFont?: FontAppr;
  column: Partial<TableColumnAppr>;
  modify(appr: Partial<TableColumnAppr>): void;
}

export const FontPanel: React.SFC<Props> = (props) => {
  const font = { ...props.defaultFont, ...props.column.font };

  return (
    <div style={{ padding: 5 }} className={'vert-panel-1'}>
      <DropDown
        value={{ value: font.family }}
        values={getFontList().map(value => ({ value }))}
        onSelect={v => {
          props.modify({ font: { family: v.value } });
        }}
      />
      <div className='horz-panel-1'>
        <Button
          small
          style={{backgroundColor: font.color, width: '1em' }}
        />
        <ButtonGroup>
          <Button
            small
            icon='align-left'
            active={font.align == 'left'}
            onClick={() => props.modify({ font: { align: 'left' } })}
          />
          <Button
            small
            icon='align-center'
            active={font.align == 'center'}
            onClick={() => props.modify({ font: { align: 'center' } })}
          />
          <Button icon='align-right'
            small
            active={font.align == 'right'}
            onClick={() => props.modify({ font: { align: 'right' } })}
          />
        </ButtonGroup>
        <ButtonGroup>
          <Button
            small
            icon='bold'
            active={font.bold}
            onClick={() => props.modify({ font: { bold: !(font.bold || false) }})}
          />
          <Button
            small
            icon='italic'
            active={font.italic}
            onClick={() => props.modify({ font: { italic: !(font.italic || false) }})}
          />
        </ButtonGroup>
      </div>
    </div>
  );
}
