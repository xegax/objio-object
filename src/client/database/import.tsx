import * as React from 'react';
import { DatabaseTable } from './database-table';
import { ObjProps } from '../../base/object-base';
import { confirm, Intent } from 'ts-react-ui/prompt';
import { TableFile, JSONTableFile, CSVTableFile } from '../table-file';
import { DropDown } from 'ts-react-ui/drop-down';
import { CheckBox } from 'ts-react-ui/checkbox';

type ImportType = 'replace' | 'append' | 'newtable';

interface ImportCfg {
  source: TableFile;
  sources: Array<TableFile>;
  importType: ImportType;
  tableName?: string;
  autoTableName?: string;

  method?: boolean;
}

interface Props {
  cfg: ImportCfg;
}

class Dialog extends React.Component<Props> {
  render() {
    const cfg = this.props.cfg;
    let method = true;
    if (cfg.method != null)
      method = cfg.method;

    const values = cfg.sources;
    return (
      <div className='vert-panel-1'>
        <div className='horz-panel-1 flexrow'>
          <span style={{ width: '6em' }}>source:</span>
          <DropDown
            style={{ flexGrow: 1 }}
            values={values.map(v => ({ value: v.getID(), render: v.getName() }))}
            value={cfg.source ? { value: cfg.source.getID() } : DropDown.NOTHING_SELECT }
            onSelect={v => {
              cfg.source = values.find(src => src.getID() == v.value);
              if (cfg.importType == 'newtable')
                cfg.autoTableName = cfg.source.getName().replace(/[\.]/g, '_').toLocaleLowerCase();
              this.setState({});
            }}
          />
        </div>
        {method && <div className='horz-panel-1 flexrow'>
          <span style={{ width: '6em' }}>method:</span>
          <DropDown
            style={{ flexGrow: 1 }}
            values={[
              { value: 'replace', render: 'replace' },
              { value: 'newtable', render: 'new table' },
              { value: 'append', render: 'append rows' }
            ]}
            value={{ value: cfg.importType }}
            onSelect={v => {
              cfg.importType = v.value as any;
              this.setState({});
            }}
          />
        </div>}
        <div className='horz-panel-1 flexrow' style={{ display: cfg.importType != 'newtable' ? 'none' : undefined }}>
          <span style={{ width: '6em' }}>table name:</span>
          <input
            style={{ flexGrow: 1 }}
            value={cfg.tableName || cfg.autoTableName}
            onChange={evt => {
              cfg.tableName = evt.target.value;
              this.setState({});
            }}
          />
        </div>
      </div>
    );
  }
}

export function importTable(args: { objProps: ObjProps, source?: TableFile, method?: boolean }): Promise<ImportCfg> {
  const { objProps, source, method } = args;
  const cfg: ImportCfg = {
    sources: objProps.objects([ JSONTableFile, CSVTableFile ]).map(obj => obj as TableFile),
    source,
    importType: 'replace',
    method
  };

  if (!source) {
    cfg.source = null;
    cfg.importType = 'newtable';
  }

  return (
    confirm({
      title: 'Import table from file source',
      intent: Intent.NONE,
      body: <Dialog cfg={cfg} />
    })
    .then(() => cfg)
  );
}
