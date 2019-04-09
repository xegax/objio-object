import * as React from 'react';
import { DatabaseHolder } from '../client/database/database-holder';
import { GridLoadable, HeaderProps, CellPropsExt } from 'ts-react-ui/grid-loadable';
import { StrMap } from '../common/interfaces';

export { DatabaseHolder };

export interface Props {
  model: DatabaseHolder;
}

// general view of database
export class DatabaseHolderView extends React.Component<Props> {
  ref = React.createRef<GridLoadable>();

  onColumnsChanged = () => {
  };

  componentDidMount() {
    this.props.model.holder.subscribe(this.onColumnsChanged, 'columns');
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.onColumnsChanged, 'columns');
  }

  renderCell = (props: CellPropsExt) => {
    return (
      <span>{props.data}</span>
    );
  }

  renderHeader = (props: HeaderProps) => {
    const table = this.props.model.getSelectTable();
    if (!table || table instanceof Promise)
      return null;

    return (
      <span>{table.columns[props.col].colName}</span>
    );
  }

  renderNotConfigured() {
    return 'object not configured properly';
  }

  renderTable() {
    const model = this.props.model;
    const table = model.getSelectTable();
    if (!table || table instanceof Promise)
      return null;

    return (
      <div style={{ position: 'relative', flexGrow: 1}}>
        <GridLoadable
          ref={this.ref}
          key={table.tableName}
          colsCount={table.columns.length}
          rowsCount={table.rowsNum}
          loader={(from, count) => {
            let res: Promise<Array<StrMap>>;
            res = model.loadTableData({ tableName: table.tableName, fromRow: from, rowsNum: count })
            .then(res => res.rows.map((row, i) => row));

            return res;
          }}
          renderHeader={this.renderHeader}
          renderCell={this.renderCell}
        />
      </div>
    );
  }

  renderContent() {
    const model = this.props.model;
    if (model.isRemote()) {
      if (!model.getConnection() || !model.getDatabase())
        return this.renderNotConfigured();
    }

    return this.renderTable();
  }

  render() {
    return (
      <div style={{ position: 'relative', flexGrow: 1 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, display: 'flex' }}>
          {this.renderContent()}
        </div>
      </div>
    );
  }
}
