import * as React from 'react';
import { ObjProps, ObjectBase, ObjInfoProv, ObjInfo } from '../../base/object-base';
import { confirm, Intent } from 'ts-react-ui/prompt';
import { DatabaseHolder } from '../database/database-holder';
import { DropDown } from 'ts-react-ui/drop-down';
import { DataSourceHolder } from './data-source-holder';
import { CSSIcon } from 'ts-react-ui/cssicon';

export interface ExportCfg {
  src: DataSourceHolder;
  destId: string;
  destArr: Array<ObjInfoProv>;
  tableName?: string;
  autoTableName?: string;

  replaceExists?: boolean;
}

interface Props {
  cfg: ExportCfg;
}

class Dialog extends React.Component<Props> {
  private onReplace = () => {
    this.props.cfg.replaceExists = !this.props.cfg.replaceExists;
    this.setState({});
  }

  render() {
    const cfg = this.props.cfg;
    const values = cfg.destArr.map(prov => {
      const obj = prov();
      return { value: obj.id, render: obj.name };
    });

    return (
      <div className='vert-panel-2'>
        <div className='horz-panel-1 flexrow'>
          <span style={{ width: '6em' }}>Destination:</span>
          <DropDown
            style={{ flexGrow: 1 }}
            values={values}
            value={cfg.destId ? { value: cfg.destId } : DropDown.NOTHING_SELECT }
            onSelect={v => {
              cfg.destId = v.value;
              this.setState({});
            }}
          />
        </div>
        <div className='horz-panel-1 flexrow'>
          <span style={{ width: '6em' }}>Table name:</span>
          <input
            style={{ flexGrow: 1 }}
            value={cfg.tableName || cfg.autoTableName}
            onChange={evt => {
              cfg.tableName = evt.target.value;
              this.setState({});
            }}
          />
        </div>
        <div className='horz-panel-1'>
          <CSSIcon
            style={{ width: '1em' }}
            icon={cfg.replaceExists ? 'fa fa-check-square-o' : 'fa fa-square-o'}
            onClick={this.onReplace}
          />
          <span onClick={this.onReplace}>
            Replace
          </span>
        </div>
      </div>
    );
  }
}

interface ExportToDatabseArgs {
  objProps: ObjProps;
  src: DataSourceHolder;
  destId?: string;
  replaceExists?: boolean;
}

export function exportToDatabase(args: ExportToDatabseArgs): Promise<ExportCfg> {
  const { objProps, destId, src, replaceExists } = args;
  const cfg: ExportCfg = {
    src,
    destArr: objProps.objects([ DatabaseHolder ]),
    destId,
    replaceExists,
    autoTableName: src.getName().replace(/[\.]/g, '_').toLocaleLowerCase()
  };

  if (!destId) {
    cfg.destId = null;
    cfg.replaceExists = false;
  }

  return (
    confirm({
      title: 'Export table to database',
      intent: Intent.NONE,
      body: <Dialog cfg={cfg} />
    })
    .then(() => ({
      ...cfg,
      tableName: cfg.tableName || cfg.autoTableName
    }))
  );
}
