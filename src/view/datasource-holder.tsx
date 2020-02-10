import * as React from 'react';
import { DataSourceHolder } from '../client/datasource/data-source-holder';
import { Grid, CellProps, HeaderProps } from 'ts-react-ui/grid/grid';

interface Props {
  model: DataSourceHolder;
}

export class DatasourceHolderView extends React.Component<Props> {
  private subscriber = () => {
    this.setState({});
  };

  componentDidMount() {
    this.props.model.holder.subscribe(this.subscriber);
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.subscriber);
  }

  private renderCell = (p: CellProps) => {
    const row = this.props.model.getGrid().getRowOrLoad(p.row);
    if (!row)
      return null;

    return (
      <span>{row.cell[p.col]}</span>
    );
  }

  private renderHeader = (header: HeaderProps) => {
    const table = this.props.model.getDesc();
    if (!table)
      return null;

    return (
      <span>{table.cols[header.col]}</span>
    );
  }

  private renderTable() {
    const grid = this.props.model.getGrid();
    if (!grid)
      return null;

    return (
      <>
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
    return (
      <div style={{ position: 'relative', flexGrow: 1 }}>
        <div className='flexcol' style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
          {this.renderTable()}
        </div>
      </div>
    );
  }
}
