import * as React from 'react';
import {
  Button,
  ButtonGroup
} from 'ts-react-ui/blueprint';
import { DropDown } from 'ts-react-ui/drop-down';
import { getFontList, getFontSize, FontAppr } from '../base/appr-decl';
import { getColor } from 'ts-react-ui/color';

interface Props {
  font: FontAppr;
  onChange(appr: Partial<FontAppr>): void;
}

export const FontPanel: React.SFC<Props> = (props) => {
  const font = { ...props.font };

  return (
    <div style={{ padding: 5 }} className='vert-panel-1'>
      <div className='horz-panel-1 flexrow'>
        <DropDown
          style={{ flexGrow: 1 }}
          value={{ value: font.family }}
          values={getFontList().map(value => ({ value }))}
          onSelect={v => {
            props.onChange({ family: v.value });
          }}
        />
        <DropDown
          style={{ display: 'inline-block', width: '3.1em' }}
          value={{ value: '' + font.sizePx }}
          values={getFontSize().map(value => ({ value: '' + value }))}
          onSelect={val => {
            props.onChange({ sizePx: +val.value });
          }}
        />
      </div>
      <div className='horz-panel-1'>
        <Button
          small
          style={{backgroundColor: font.color, width: '1em' }}
          onClick={() => {
            const onChanging = (color: string) => {
              props.onChange({ color });
            };

            getColor({
              color: props.font.color,
              onChanging
            })
            .then(onChanging)
            .catch(() => onChanging(props.font.color));
          }}
        />
        <ButtonGroup>
          <Button
            small
            icon='align-left'
            active={font.align == 'left'}
            onClick={() => props.onChange({ align: 'left' })}
          />
          <Button
            small
            icon='align-center'
            active={font.align == 'center'}
            onClick={() => props.onChange({ align: 'center' })}
          />
          <Button icon='align-right'
            small
            active={font.align == 'right'}
            onClick={() => props.onChange({ align: 'right' })}
          />
        </ButtonGroup>
        <ButtonGroup>
          <Button
            small
            icon='bold'
            active={font.bold}
            onClick={() => props.onChange({ bold: !(font.bold || false) })}
          />
          <Button
            small
            icon='italic'
            active={font.italic}
            onClick={() => props.onChange({ italic: !(font.italic || false) })}
          />
        </ButtonGroup>
      </div>
    </div>
  );
}

export const FontValue: React.SFC<FontAppr> = (props) => {
  return (
    <span
      style={{
        color: props.color,
        fontFamily: props.family,
        fontWeight: props.bold ? 'bold' : undefined,
        fontStyle: props.italic ? 'italic' : undefined
      }}
    >
      {props.family}, {props.sizePx}px
    </span>
  );
};
