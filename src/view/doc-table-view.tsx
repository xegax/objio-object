import * as React from 'react';
import { Database, DocTable, DocTableArgs, RemoteDatabase } from '../client/database';
import { FitToParent } from 'ts-react-ui/fittoparent';
import { RenderListModel, RenderArgs } from 'ts-react-ui/model/list';
import { List } from 'ts-react-ui/list';
import { TableFile } from '../client/table-file';
import { ConfigBase } from './config';
import { PropsGroup, TextPropItem, DropDownPropItem } from 'ts-react-ui/prop-sheet';
import { TableFileBase } from '../base/table-file/index';

export { DocTable };

export interface DocTableProps {
  model: DocTable;
}

export class DocTableView extends React.Component<DocTableProps> {
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

    model.setItemsCount(this.props.model.getTotalRowsNum());
    model.setColumns(this.props.model.getColumns().map((col, c) => {
      return {
        name: col.name,
        render: (args: RenderArgs<Array<string>>) => {
          return (
            <div>
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
    if (this.props.model.getStatus() == 'ok')
      return null;

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
    return (
      <>
        {this.renderErrors()}
        {this.renderTable()}
      </>
    );
  }

  render() {
    const model = this.props.model;
    return (
      <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1}}>
        {this.renderInvalid() || this.renderValid()}
      </div>
    );
  }
}

export interface CfgState {
  dbId: string;
  csvId: string;
  dbs: Array<Database | RemoteDatabase>;
  csvs: Array<TableFileBase>;
}

export class DocTableConfig extends ConfigBase<DocTableArgs, CfgState> {
  componentDidMount() {
    this.config.tableName = 'table';
    const dbs = this.props.objects([Database, RemoteDatabase]) as Array< Database | RemoteDatabase>;
    const csvs = this.props.objects([TableFile]) as Array<TableFile>;

    this.config.dest = dbs[0];
    this.config.source = csvs[0];
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
            this.config.source = this.state.csvs.find(csv => csv.holder.getID() == csvId);
            this.setState({ csvId });
          }}
        />
      </PropsGroup>
    );
  }
}
