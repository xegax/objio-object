import * as React from 'react';
import { TableFile } from '../client/table-file';
import { ColumnAttr } from '../base/table-file/table-file-decl';
import { DropDown } from 'ts-react-ui/drop-down';
import { CheckBox } from 'ts-react-ui/checkbox';
import { ListView } from 'ts-react-ui/list-view';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { Icon } from 'ts-react-ui/icon';
import { Popover } from 'ts-react-ui/popover';
import { Menu, MenuItem } from 'ts-react-ui/blueprint';
import * as numIcon from '../images/num.png';
import * as intIcon from '../images/int.png';
import * as strIcon from '../images/str.png';
import * as naIcon from '../images/na.png';
import * as textIcon from '../images/text.png';
import { CSSIcon } from 'ts-react-ui/cssicon';
import { PropsGroup, PropItem } from 'ts-react-ui/prop-sheet';

export { TableFile };

export interface Props {
  onlyContent?: boolean;
  model: TableFile;
  renderSpecificProps?(): JSX.Element;
}

export interface State {
  stats: boolean;
}

function getTypeIcon(type: string): JSX.Element {
  if (type == 'TEXT') {
    return (
      <Icon
        width='1em'
        height='1em'
        src={textIcon}
      />
    );
  }

  if (type.startsWith('VARCHAR')) {
    return (
      <Icon
        width='1em'
        height='1em'
        src={strIcon}
      />
    );
  }

  if (type == 'REAL') {
    return (
      <Icon
        width='1em'
        height='1em'
        src={numIcon}
      />
    );
  }

  if (type == 'INTEGER') {
    return (
      <Icon
        width='1em'
        height='1em'
        src={intIcon}
      />
    );
  }

  if (type == 'DATE') {
    return (
      <CSSIcon
        style={{ width: '1em', height: '1em' }}
        icon='fa fa-calendar'
      />
    );
  }

  return (
    <CSSIcon
      icon='fa fa-square'
      style={{ width: '1em', height: '1em' }}
    />
  );
}

export class TableFileProps extends React.Component<Props, Partial<State>> {
  state: Partial<State> = {};

  subscriber = () => {
    this.setState({});
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.subscriber);
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.subscriber);
  }

  renderIndex(col: ColumnAttr) {
    return (
      <CheckBox
        value={col.index}
        onChange={index => {
          this.props.model.setColumn({
            name: col.name,
            index
          });
        }}
      />
    );
  }

  renderDiscard(col: ColumnAttr) {
    return (
      <CheckBox
        value={col.discard}
        onChange={discard => {
          this.props.model.setColumn({
            name: col.name,
            discard
          });
        }}
      />
    );
  }

  renderType(col: ColumnAttr) {
    const onChange = (type: string) => {
      return () => {
        this.props.model.setColumn({ name: col.name, type });
      };
    };

    return (
      <Popover targetClassName='flexcol'>
        {getTypeIcon(col.type)}
        <Menu>
          <MenuItem onClick={onChange('TEXT')} text='TEXT'/>
          <MenuItem onClick={onChange('VARCHAR')} text='VARCHAR'/>
          <MenuItem onClick={onChange('INTEGER')} text='INTEGER'/>
          <MenuItem onClick={onChange('REAL')} text='REAL'/>
          <MenuItem onClick={onChange('DATE')} text='DATE'/>
        </Menu>
      </Popover>
    );
  }

  renderDataTypeIcons(col: ColumnAttr) {
    const statMap = this.props.model.getStatMap();
    const stat = statMap[col.name];
    if (!stat)
      return null;

    let nums = 0, strs = 0, ints = 0, nulls = 0;
    Object.keys(statMap).forEach(key => {
      nums += statMap[key].nums;
      strs += statMap[key].strs;
      ints += statMap[key].ints;
      nulls += statMap[key].nulls;
    });

    const opacity = 0.2;
    return (
      <>
        <Icon
          src={naIcon}
          width='1em'
          height='1em'
          style={{ opacity: stat.nulls ? 1 : opacity, display: nulls ? null : 'none' }}
          title={stat.nulls ? `count: ${stat.nulls}` : ''}
        />
        <Icon
          src={numIcon}
          width='1em'
          height='1em'
          style={{ opacity: stat.nums ? 1 : opacity, display: nums ? null : 'none' }}
          title={stat.nums ? `count: ${stat.nums}; range: [${stat.minValue} ; ${stat.maxValue}]` : ''}
        />
        <Icon
          src={intIcon}
          width='1em'
          height='1em'
          style={{ opacity: stat.ints ? 1 : opacity, display: ints ? null : 'none' }}
          title={stat.ints ? `count: ${stat.ints}; range: [${stat.minValue} ; ${stat.maxValue}]` : ''}
        />
        <Icon
          src={strIcon}
          width='1em'
          height='1em'
          style={{ opacity: stat.strs ? 1 : opacity, display: strs ? null : 'none' }}
          title={stat.strs ? `count: ${stat.strs}; size range: [${stat.minSize} ; ${stat.maxSize}]` : ''}
        />
      </>
    );
  }

  renderHeader() {
    const style = {
      alignItems: 'center',
      display: 'flex'
    };

    const model = this.props.model;
    return (
      <div className='horz-panel-5px' style={style}>
        <CheckBox
          title='Include'
          value={true}
          onChange={() => {
            let discards = 0;
            model.getColumns({discard: true})
            .forEach(col => col.discard && discards++);

            model.getColumns({discard: true})
            .forEach(col => {
              model.setColumn({ name: col.name, discard: discards == 0 ? true : false });
            });
          }}
        />
        <CheckIcon
          title='Indexing'
          faIcon='fa fa-info-circle'
          value={true}
          onChange={() => {
            let indexs = 0;
            model.getColumns({discard: true})
            .forEach(col => col.index && indexs++);

            model.getColumns({discard: true})
            .forEach(col => {
              model.setColumn({ name: col.name, index: indexs == 0 ? true : false });
            });
          }}
        />
        <CheckIcon
          title='Statistics'
          faIcon='fa fa-pie-chart'
          value={true}
          onChange={() => {
            this.setState({ stats: !this.state.stats });
          }}
        />
      </div>
    );
  }

  renderColumn = (col: ColumnAttr) => {
    const style = {
      alignItems: 'center',
      display: 'flex',
      color: col.discard ? 'silver' : null
    };

    return {
      value: col.name,
      title: `${col.name}, ${col.type}${col.size ? '(' + col.size + ')' : ''}`,
      render: (
        <div className='horz-panel-5px' style={style}>
          <CheckBox
            title='Include'
            value={!col.discard}
            onChange={show => {
              this.props.model.setColumn({ name: col.name, discard: !show });
            }}
          />
          <CheckIcon
            title='Indexing'
            faIcon='fa fa-info-circle'
            value={col.index}
            onChange={index => {
              this.props.model.setColumn({ name: col.name, index });
            }}
          />
          {this.renderType(col)}
          {this.state.stats && this.renderDataTypeIcons(col)}
          <span>{col.name}</span>
        </div>
      )
    };
  }

  render() {
    const header = {
      value: '',
      render: this.renderHeader()
    };

    const values = [
      ...this.props.model.getColumns({ discard: true })
      .map(this.renderColumn)
    ];

    return (
      <>
        <PropsGroup label='Properties'>
          {this.props.renderSpecificProps && this.props.renderSpecificProps()}
          <PropItem
            label='Rows count'
            value={this.props.model.getRows()}
          />
        </PropsGroup>
        <PropsGroup label='Columns' padding={false}>
          <ListView
            header={header}
            border={false}
            values={values}
          />
        </PropsGroup>
      </>
    );
  }
}
