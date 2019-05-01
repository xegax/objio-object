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
  grid = new GridLoadableModel<StrMap>();
  state: State = {};

  constructor(props) {
    super(props);

    this.grid.setLoader((from, count) => {
      const model = this.props.model;
      const info = model.getTableInfo();
      return (
        model.loadTableData({
          tableName: info.tableName,
          fromRow: from,
          rowsNum: count
        })
        .then(res => {
          return res.rows.map(obj => ({ obj }));
        })
      );
    });
    this.subscriber();
  }

  subscriber = () => {
    const info = this.props.model.getTableInfo();
    if (!info) {
      this.grid.setRowsCount(0);
      return;
    }

    this.grid.setRowsCount(info.rowsNum);
    this.grid.setColsCount(info.columns.length);
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.subscriber);
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.subscriber);
  }

  renderNotConfigured() {
    return 'object not configured properly';
  }

  renderCell = (props: CellProps) => {
    const row = this.grid.getRow(props.row);
    if (!row)
      return null;

    return (
      <span>{row.cell[props.col]}</span>
    );
  }

  renderHeader = (props: HeaderProps) => {
    const table = this.props.model.getTableInfo();
    return (
      <span>{table.columns[props.col].colName}</span>
    );
  }

  renderTable() {
    const model = this.props.model;
    const info = model.getTableInfo();
    if (!info)
      return null;

    return (
      <div style={{ position: 'relative', flexGrow: 1}}>
        <Grid
          key={info.tableName}
          model={this.grid}
          renderHeader={this.renderHeader}
          renderCell={this.renderCell}
          onScrollToBottom={() => {
            this.grid.loadNext();
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
