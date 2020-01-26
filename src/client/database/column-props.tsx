import * as React from 'react';
import { confirm, Intent } from 'ts-react-ui/prompt';
import { SelectString, Position } from 'ts-react-ui/drop-down';
import { DataType } from '../../base/database/database-table-appr';

interface Cfg {
  column: string;
  label: string;
  dataType: DataType;
}

interface Props {
  cfg: Cfg;
}

class Dialog extends React.Component<Props> {
  render() {
    const cfg = this.props.cfg;
    return (
      <div className='vert-panel-2'>
        <div className='horz-panel-1 flexrow'>
          <span style={{ width: '6em' }}>Label:</span>
          <input
            style={{ flexGrow: 1 }}
            value={cfg.label || ''}
            onChange={evt => {
              cfg.label = evt.currentTarget.value;
              this.setState({});
            }}
          />
        </div>
        <div className='horz-panel-1 flexrow'>
          <span style={{ width: '6em' }}>Data type:</span>
          <SelectString
            position={Position.BOTTOM}
            text={cfg.dataType}
            items={['text', 'image', 'video']}
            onSelect={(type: DataType) => {
              cfg.dataType = type;
              this.setState({});
            }}
          />
        </div>
      </div>
    );
  }
}

export function showColumnProps(args: Cfg): Promise<Cfg> {
  args = {...args};
  return (
    confirm({
      title: `Column properties "${args.column}"`,
      intent: Intent.NONE,
      body: <Dialog cfg={args} />
    })
    .then(() => args)
  );
}
