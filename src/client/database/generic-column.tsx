import * as React from 'react';
import { confirm, Intent } from 'ts-react-ui/prompt';
import { ListView, Item } from 'ts-react-ui/list-view2';
import { CSSIcon } from 'ts-react-ui/cssicon';
import { SelectString, Position } from 'ts-react-ui/drop-down';

interface Cfg {
  columnName: string;
  editColumn: boolean;
  format: string;
  cols: Array<string>;
  availableCols: Array<string>;
}

interface Props {
  cfg: Cfg;
}

class Dialog extends React.Component<Props> {
  render() {
    const cfg = this.props.cfg;

    const cols: Array<Item> = cfg.cols.map((c, i) => {
      return {
        value: c,
        render: () => {
          return (
            <div className='horz-panel-2'>
              <CSSIcon
                showOnHover
                icon='fa fa-trash'
                onClick={() => {
                  cfg.cols.splice(i, 1);
                  this.setState({});
                }}
              />
              <span>
                %{i + 1}<span style={{ color: 'silver' }}> {c}</span>
              </span>
            </div>
          );
        }
      };
    });

    const availableCols = cfg.availableCols.filter(c => !cfg.cols.includes(c));
    return (
      <div className='vert-panel-2'>
        <div className='horz-panel-1 flexrow'>
          <span style={{ width: '6em' }}>Column:</span>
          <input
            disabled={cfg.editColumn == false}
            style={{ flexGrow: 1 }}
            value={cfg.columnName}
            onChange={evt => {
              cfg.columnName = evt.currentTarget.value;
              this.setState({});
            }}
          />
        </div>
        <div className='horz-panel-1 flexrow'>
          <span style={{ width: '6em' }}>Format:</span>
          <input
            style={{ flexGrow: 1 }}
            value={cfg.format}
            onChange={evt => {
              cfg.format = evt.currentTarget.value;
              this.setState({});
            }}
          />
        </div>
        <div className='vert-panel-1 flexcol'>
          <ListView
            style={{ flexGrow: 1 }}
            height={140}
            values={cols}
          />
          <SelectString
            position={Position.BOTTOM}
            text='Add column'
            items={availableCols}
            onSelect={col => {
              cfg.cols.push(col);
              this.setState({});
            }}
          />
        </div>
      </div>
    );
  }
}

export function genericColumn(args: Cfg): Promise<Cfg> {
  args = {...args};
  return (
    confirm({
      title: 'Configure generic column',
      intent: Intent.NONE,
      body: <Dialog cfg={args} />
    })
    .then(() => args)
  );
}
