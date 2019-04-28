import * as React from 'react';
import { FileStorage } from '../client/file-storage';
import { GridLoadable, CellPropsExt, HeaderProps } from 'ts-react-ui/grid-loadable';
import { StrMap } from '../common/interfaces';

export {
  FileStorage
};

export interface Props {
  model: FileStorage;
}

export class FileStorageView extends React.Component<Props> {
  private ref = React.createRef<GridLoadable>();

  reload = () => {
    if (!this.ref.current)
      return;

    this.ref.current.getModel().reload({ rows: this.props.model.getFilesCount() });
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.reload, 'reload');
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.reload, 'reload');
  }

  renderCell = (props: CellPropsExt) => {
    return (
      <span>{props.rowData['name']},{props.rowData['type']}</span>
    );
  }

  renderHeader = (props: HeaderProps) => {
    return (
      <span>name</span>
    );
  }

  renderTable() {
    const model = this.props.model;
    const count = model.getFilesCount();

    return (
      <div style={{ position: 'relative', flexGrow: 1}}>
        <GridLoadable
          ref={this.ref}
          colsCount={1}
          rowsCount={count}
          loader={(from, count) => {
            let res: Promise<Array<StrMap>>;
            res = model.loadData({ from, count })
            .then(res => {
              return res.files.map((row, i) => row as any)
            });

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
