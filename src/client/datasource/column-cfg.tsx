import * as React from 'react';
import { confirm, Intent } from 'ts-react-ui/prompt';

interface Cfg {
  name: string;
  rename: string;
  label: string;
  size?: number;
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
          <span style={{ width: '6em' }}>Name:</span>
          <input
            style={{ flexGrow: 1 }}
            value={cfg.rename}
            onChange={evt => {
              cfg.rename = evt.currentTarget.value;
              this.setState({});
            }}
          />
        </div>
        <div className='horz-panel-1 flexrow'>
          <span style={{ width: '6em' }}>Label:</span>
          <input
            style={{ flexGrow: 1 }}
            value={cfg.label}
            onChange={evt => {
              cfg.label = evt.currentTarget.value;
              this.setState({});
            }}
          />
        </div>
        <div className='horz-panel-1 flexrow'>
          <span style={{ width: '6em' }}>Size:</span>
          <input
            style={{ flexGrow: 1 }}
            value={cfg.size || 0}
            type='number'
            onChange={evt => {
              const tgt = evt.currentTarget;
              cfg.size = parseInt(tgt.value, 10) || 0;

              this.setState({});
            }}
          />
        </div>
      </div>
    );
  }
}

export function columnCfg(args: Cfg): Promise<Cfg> {
  args = {...args};
  return (
    confirm({
      title: `Column "${args.rename || args.name}" configure`,
      intent: Intent.NONE,
      body: <Dialog cfg={args} />
    })
    .then(() => args)
  );
}
