import * as React from 'react';
import { DatabaseTable } from '../client/database/database-table';
import { Grid, CellProps, HeaderProps } from 'ts-react-ui/grid/grid';

export { DatabaseTable };

export interface Props {
  model: DatabaseTable;
}

export class DatabaseTableView extends React.Component<Props> {
  notify = () => {
    this.setState({});
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.notify);
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.notify);
  }

  renderNotConfigured() {
    return 'object not configured properly';
  }

  renderCell = (props: CellProps) => {
    const row = this.props.model.getGrid().getRowOrLoad(props.row);
    if (!row)
      return null;

    const colAppr = this.props.model.getColumnApprByIdx(props.col);
    const align = colAppr.font.align;
    if (align)
      props.className = 'cell-align-' + align;

    return (
      <span
        style={{
          fontFamily: colAppr.font.family,
          fontWeight: colAppr.font.bold ? 'bold' : null,
          fontStyle: colAppr.font.italic ? 'italic' : null
        }}
      >
        {row.cell[props.col]}
      </span>
    );
  }

  renderHeader = (props: HeaderProps) => {
    const table = this.props.model.getTableInfo();
    if (!table || !table.columns[props.col])
      return null;

    return (
      <span>{table.columns[props.col].colName}</span>
    );
  }

  renderTable() {
    const grid = this.props.model.getGrid();
    if (!grid)
      return null;

    return (
      <div style={{ position: 'relative', flexGrow: 1}}>
        <Grid
          model={grid}
          renderHeader={this.renderHeader}
          renderCell={this.renderCell}
          onScrollToBottom={() => {
            grid.loadNext();
          }}
        />
      </div>
    );
  }

  render() {
    const model = this.props.model;
    let jsx: React.ReactChild;
    if (!model.getDatabase() || !model.getTableName() || !model.isTableValid())
      jsx = this.renderNotConfigured();
    else if (!model.isStatusInProgess())
      jsx = this.renderTable();

    return (
      <div style={{ position: 'relative', flexGrow: 1 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, display: 'flex' }}>
          {jsx}
        </div>
      </div>
    );
  }
}
