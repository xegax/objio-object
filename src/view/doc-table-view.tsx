import * as React from 'react';
import { DocTable, DocTableArgs } from '../client/doc-table';
import { ExecuteArgs } from '../base/table';
import { FileObject } from '../client/file-object';
import { FitToParent } from 'ts-react-ui/fittoparent';
import { RenderListModel, RenderArgs } from 'ts-react-ui/model/list';
import { List } from 'ts-react-ui/list';
import { TableFile } from '../client/table-file';
import { ConfigBase } from './config';
import { Database } from '../client/database';
import { OBJIOItem } from 'objio';
import { PropSheet, PropsGroup, TextPropItem, DropDownPropItem } from 'ts-react-ui/prop-sheet';

export { DocTable };

export interface Props {
  model: DocTable;
}

export interface State {
  editRow?: number;
  editCol?: number;
}

export class DocTableView extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  getRender(): RenderListModel {
    return this.props.model.getRender();
  }

  selectRow = () => {
    console.log('sel-row', this.getRender().getSelRow());
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.subscriber);
    this.getRender().subscribe(this.selectRow, 'select-row');
    this.updateModel();
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.subscriber);
    this.getRender().unsubscribe(this.selectRow, 'select-row');
  }

  updateModel() {
    const model = this.getRender();
    const update = () => {
      this.updateModel();
      model.reload();
      model.notify();
    };

    model.setItemsCount(this.props.model.getTotalRowsNum());
    model.setColumns(this.props.model.getColumns().map((col, c) => {
      return {
        name: col.name,
        render: (args: RenderArgs<Array<string>>) => {
          if (this.state.editRow == args.rowIdx && this.state.editCol == args.colIdx)
            return (
              <input
                defaultValue={args.item[c]}
                ref={el => el && el.focus()}
                onBlur={() => {
                  this.setState({editCol: null, editRow: null});
                }}
              />
            );

          return (
            <div
              onDoubleClick={() => {
                this.setState({editRow: args.rowIdx, editCol: c});
              }}
            >
              {args.item[c]}
            </div>
          );
        }
      };
    }));
  }

  subscriber = () => {
    this.updateModel();
    this.setState({});
  }

  renderTable(): JSX.Element {
    return (
      <FitToParent wrapToFlex>
        <List border model = { this.getRender() } />
      </FitToParent>
    );
  }

  renderInvalid(): JSX.Element {
    const table = this.props.model.getTableRef();
    if (table.getStatus() == 'in progress')
      return (
        <div>in progress, {table.getProgress()}</div>
      );

    return (
      <div>not confgured</div>
    );
  }

  renderErrors() {
    const errors = [
      ...this.props.model.getErrors(),
      ...this.props.model.getTableRef().getErrors()
    ];

    if (!errors.length)
      return null;

    return (
      <div>
        {errors.join(', ')}
      </div>
    );
  }

  renderValid() {
    const model = this.props.model;
    return (
      <React.Fragment>
        <div>database: {model.getTableRef().getDatabase().getName()}</div>
        <div>table: {model.getTable()}</div>
        <div>rows: {model.getTotalRowsNum()}</div>
        <div>last execute time: {model.getLastExecuteTime()}</div>
        {this.renderErrors()}
        <div>
          <button
            onClick={() => {
              const args: ExecuteArgs = {
                table: model.getTable(),
                fileObjId: model.getFileObjId()
              };

              model.holder.getObject<FileObject>(model.getFileObjId())
              .then((csv: TableFile) => {
                args.columns = csv.getColumns();
                model.execute(args);
              });
            }}
          >
            execute
          </button>
        </div>
        {this.renderTable()}
      </React.Fragment>
    );
  }

  render() {
    const model = this.props.model;
    return (
      <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1}}>
        {!model.getTableRef().isStatusInProgess() ? this.renderValid() : this.renderInvalid()}
      </div>
    );
  }
}

export interface CfgState {
  dbId: string;
  csvId: string;
  dbs: Array<Database>;
  csvs: Array<TableFile>;
}

export class DocTableConfig extends ConfigBase<DocTableArgs, CfgState> {
  componentDidMount() {
    this.config.tableName = 'table';
    const dbs = this.props.objects().map(obj => {
      if (obj instanceof Database)
        return obj;

      return null;
    }).filter(obj => obj != null);

    const csvs = this.props.objects().map(obj => {
      if (obj instanceof TableFile)
        return obj;
      return null;
    }).filter(obj => obj != null) as Array<TableFile>;

    this.config.dest = dbs[0];
    this.config.source = csvs[0] as TableFile;
    this.setState({
      dbs,
      csvs,
      dbId: dbs.length ? dbs[0].holder.getID() : ''
    });
  }

  render() {
    return (
      <PropsGroup label='database table'>
        <DropDownPropItem
          label='database'
          value={{value: this.state.dbId}}
          values={(this.state.dbs || []).map((db, i) => {
            return {
              value: db.holder.getID(),
              render: db.getName()
            };
          })}
          onSelect={value => {
            this.config.dest = this.state.dbs.find(db => db.holder.getID() == value.value);
            this.setState({ dbId: value.value });
          }}
        />
        <TextPropItem
          label='table name'
          value={this.config.tableName}
          onEnter={value => {
            this.config.tableName = value;
          }}
        />
        <DropDownPropItem
          label='file source'
          value={{value: this.state.csvId}}
          values={(this.state.csvs || []).map((csv, i) => {
            return {
              value: csv.holder.getID(),
              render: csv.getName()
            };
          })}
          onSelect={value => {
            const csvId = value.value;
            this.config.source = this.state.csvs.find(csv => csv.holder.getID() == csvId) as TableFile;
            this.setState({ csvId });
          }}
        />
      </PropsGroup>
    );
  }
}
