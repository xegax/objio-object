import * as React from 'react';
import { Table2 } from '../client/database/table2';
import { GridLoadable } from 'ts-react-ui/grid-loadable';
import { StrMap } from '../common/interfaces';

export { Table2 };

interface Props {
  model: Table2;
}

interface State {
}

export class Table2View extends React.Component<Props, State> {
  state: State = {};
  ref = React.createRef<GridLoadable>();

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  renderNotConfigured() {
    return 'object not configured properly';
  }

  renderCell = (props) => {
    return (
      <span>{props.data}</span>
    );
  }

  renderHeader = (props) => {
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
        <GridLoadable
          ref={this.ref}
          key={info.tableName}
          colsCount={info.columns.length}
          rowsCount={info.rowsNum}
          loader={(from, count) => {
            let res: Promise<Array<StrMap>>;
            res = model.loadTableData({ tableName: info.tableName, fromRow: from, rowsNum: count })
            .then(res => res.rows.map((row, i) => row));

            return res;
          }}
          renderHeader={this.renderHeader}
          renderCell={this.renderCell}
        />
      </div>
    );
  }

  render() {
    const model = this.props.model;
    let jsx: React.ReactChild;
    if (!model.getDatabase() || !model.getTableName() || !model.isTableValid())
      jsx = this.renderNotConfigured();
    else
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
