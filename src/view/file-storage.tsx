import * as React from 'react';
import { FileStorage } from '../client/file-storage';
import { Grid, CellProps, HeaderProps } from 'ts-react-ui/grid/grid';

export {
  FileStorage
};

export interface Props {
  model: FileStorage;
}

export class FileStorageView extends React.Component<Props> {
  renderCell = (props: CellProps) => {
    const row = this.props.model.getGrid().getRowOrLoad(props.row);
    if (!row)
      return null;

    return (
      <span>{row.cell[props.col]}</span>
    );
  }

  renderHeader = (props: HeaderProps) => {
    return (
      <span>{this.props.model.getColumns()[props.col]}</span>
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
    if (model.getStatus() == 'not configured')
      jsx = 'not configured';
    else
      jsx = this.renderTable();

    return (
      <div key={model.holder.getID()} style={{ position: 'relative', flexGrow: 1 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, display: 'flex' }}>
          {jsx}
        </div>
      </div>
    );
  }
}
