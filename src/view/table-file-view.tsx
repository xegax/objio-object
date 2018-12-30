import * as React from 'react';
import { TableFile } from '../client/table-file';
import { ColumnAttr } from '../base/table';
import { DropDown } from 'ts-react-ui/drop-down';
import { CheckBox } from 'ts-react-ui/checkbox';
import { ListView } from 'ts-react-ui/list-view';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { Icon } from 'ts-react-ui/icon';
import * as numIcon from '../images/num.png';
import * as intIcon from '../images/int.png';
import * as strIcon from '../images/str.png';
import * as naIcon from '../images/na.png';

export { TableFile };

export interface Props {
  onlyContent?: boolean;
  model: TableFile;
}

export interface State {
  stats: boolean;
}

const allColumTypes = [
  'TEXT',
  'INTEGER',
  'REAL',
  'DATE',
  'VARCHAR(16)',
  'VARCHAR(32)',
  'VARCHAR(64)',
  'VARCHAR(128)',
  'VARCHAR(256)'
].map(type => ({ value: type }));

export class TableFileView extends React.Component<Props, Partial<State>> {
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
    return (
      <DropDown
        width={80}
        value={{ value: col.type }}
        values={allColumTypes}
        onSelect={value => {
          this.props.model.setColumn({
            name: col.name,
            type: value.value
          });
        }}
      />
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
          width={18}
          height={18}
          style={{ opacity: stat.nulls ? 1 : opacity, display: nulls ? null : 'none' }}
          title={stat.nulls ? `count: ${stat.nulls}` : ''}
        />
        <Icon
          src={numIcon}
          width={18}
          height={18}
          style={{ opacity: stat.nums ? 1 : opacity, display: nums ? null : 'none' }}
          title={stat.nums ? `count: ${stat.nums}; range: [${stat.minValue} ; ${stat.maxValue}]` : ''}
        />
        <Icon
          src={intIcon}
          width={18}
          height={18}
          style={{ opacity: stat.ints ? 1 : opacity, display: ints ? null : 'none' }}
          title={stat.ints ? `count: ${stat.ints}; range: [${stat.minValue} ; ${stat.maxValue}]` : ''}
        />
        <Icon
          src={strIcon}
          width={18}
          height={18}
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
          title='toggle on/off all'
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
          title='column will be indexed'
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
          title='toggle statistics'
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
      render: (
        <div className='horz-panel-5px' style={style}>
          <CheckBox
            title='toggle on/off'
            value={!col.discard}
            onChange={show => {
              this.props.model.setColumn({ name: col.name, discard: !show });
            }}
          />
          <CheckIcon
            title='column will be indexed'
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
    const values = [
      { value: '', render: this.renderHeader() },
      ...this.props.model.getColumns({ discard: true }).map(this.renderColumn)
    ];

    return (
      <ListView
        border={false}
        values={values}
      />
    );
  }
}
