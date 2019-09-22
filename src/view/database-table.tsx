import * as React from 'react';
import { DatabaseTable } from '../client/database/database-table';
import { Grid, CellProps, HeaderProps } from 'ts-react-ui/grid/grid';
import { HorizontalResizer } from 'ts-react-ui/resizer';

export { DatabaseTable };

export interface Props {
  model: DatabaseTable;
}

interface State {
  detailsSize: number;
}

export class DatabaseTableView extends React.Component<Props, State> {
  state: State = {
    detailsSize: 100
  };

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
          color: colAppr.font.color,
          fontFamily: colAppr.font.family,
          fontWeight: colAppr.font.bold ? 'bold' : null,
          fontStyle: colAppr.font.italic ? 'italic' : null,
          fontSize: colAppr.font.sizePx
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

    const colName = table.columns[props.col].colName;
    const c = this.props.model.getAppr().columns[colName] || {};
    return (
      <span>{c.label || colName}</span>
    );
  }

  renderDetails() {
    if (!this.props.model.isSelectionDataEnabled())
      return null;

    const s = {
      height: this.state.detailsSize,
      flexGrow: 0,
      backgroundColor: 'white',
      overflow: 'auto',
      padding: 5
    };

    return (
      <>
        <div style={s}>
          {(this.props.model.getSelectionData() || []).map(f => {
            return (
              <div key={f.key}>
                <span style={{ fontWeight: 'bold' }}>
                  {this.props.model.getColumnProp(f.key).label || f.key}
                </span>: {f.value}
              </div>
            );
          })}
        </div>
        <div style={{ flexGrow: 0, height: 5, position: 'relative' }}>
          <HorizontalResizer
            side='center'
            size={this.state.detailsSize}
            onResizing={size => {
              this.setState({ detailsSize: size });
            }}
          />
        </div>
      </>
    );
  }

  renderTable() {
    const grid = this.props.model.getGrid();
    if (!grid)
      return null;

    return (
      <>
        <div style={{ flexGrow: 0 }}>
          Number of rows: {grid.getTotalRowsCount()}
        </div>
        {this.renderDetails()}
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <Grid
            model={grid}
            renderHeader={this.renderHeader}
            renderCell={this.renderCell}
            onScrollToBottom={() => {
              grid.loadNext();
            }}
          />
        </div>
      </>
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
        <div className='flexcol' style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
          {jsx}
        </div>
      </div>
    );
  }
}
