import * as React from 'react';
import { DatabaseHolder } from '../client/database/database-holder';
import { HeaderProps, CellProps, Grid } from 'ts-react-ui/grid/grid';

export { DatabaseHolder };

export interface Props {
  model: DatabaseHolder;
}

// general view of database
export class DatabaseHolderView extends React.Component<Props> {
  renderCell = (props: CellProps) => {
    const row = this.props.model.getGrid().getRowOrLoad(props.row);
    if (!row)
      return null;

    return (
      <span>{row.cell[props.col]}</span>
    );
  }

  renderHeader = (props: HeaderProps) => {
    const table = this.props.model.getSelectTable();
    if (!table)
      return null;

    return (
      <span>{table.desc.columns[props.col].colName}</span>
    );
  }

  renderNotConfigured() {
    return 'object not configured properly';
  }

  renderTable() {
    const model = this.props.model;
    const table = model.getSelectTable();
    const grid = model.getGrid();
    if (!table || table instanceof Promise || !grid)
      return null;

    return (
      <div style={{ position: 'relative', flexGrow: 1}}>
        <Grid
          model={grid}
          key={table.tableName}
          renderHeader={this.renderHeader}
          renderCell={this.renderCell}
          onScrollToBottom={() => {
            grid.loadNext();
          }}
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
