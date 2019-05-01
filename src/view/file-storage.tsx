import * as React from 'react';
import { FileStorage } from '../client/file-storage';
import { GridLoadableModel } from 'ts-react-ui/grid/grid-loadable-model';
import { Grid, CellProps, HeaderProps } from 'ts-react-ui/grid/grid';
import { EntryData } from '../base/file-storage';

export {
  FileStorage
};

export interface Props {
  model: FileStorage;
}

export class FileStorageView extends React.Component<Props> {
  private grid = new GridLoadableModel<EntryData>();
  private columns: Array<keyof EntryData> = ['name', 'type', 'size'];

  constructor(props) {
    super(props);

    this.grid.setLoader((from, count) => {
      return this.props.model.loadData({ from, count })
      .then(res => {
        return res.files.map(row => ({
          obj: row,
          cell: this.columns.map(key => row[key])
        }));
      });
    });
    this.grid.setColsCount(this.columns.length);
    this.grid.setReverse(true);
    this.subsciber();
  }

  subsciber = () => {
    this.grid.setRowsCount(this.props.model.getFilesCount());
  }

  reload = () => {
    this.grid.setRowsCount(this.props.model.getFilesCount());
    this.grid.reloadCurrent();
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.reload, 'reload');
    this.props.model.holder.subscribe(this.subsciber);
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.reload, 'reload');
    this.props.model.holder.unsubscribe(this.subsciber);
  }

  renderCell = (props: CellProps) => {
    const row = this.grid.getRow(props.row);
    return (
      <span>{row.cell[props.col]}</span>
    );
  }

  renderHeader = (props: HeaderProps) => {
    return (
      <span>{this.columns[props.col]}</span>
    );
  }

  renderTable() {
    return (
      <div style={{ position: 'relative', flexGrow: 1}}>
        <Grid
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
