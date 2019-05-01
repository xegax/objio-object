import * as React from 'react';
import { Table2 } from '../client/database/table2';
import { Grid, CellProps, HeaderProps } from 'ts-react-ui/grid/grid';
import { GridLoadableModel, Row } from 'ts-react-ui/grid/grid-loadable-model';
import { StrMap } from '../common/interfaces';

export { Table2 };

export interface Props {
  model: Table2;
}

export interface State {
}

export class Table2View extends React.Component<Props, State> {
  state: State = {};

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

    return (
      <span>{row.cell[props.col]}</span>
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
