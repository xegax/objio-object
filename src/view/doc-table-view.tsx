import * as React from 'react';
import { DocTable, DocTableArgs } from '../client/doc-table';
import { ExecuteArgs } from '../client/table';
import { FileObject } from '../client/file-object';
import { FitToParent } from 'ts-react-ui/fittoparent';
import { RenderListModel, RenderArgs } from 'ts-react-ui/model/list';
import { List } from 'ts-react-ui/list';
import { CSVFileObject } from '../client/csv-file-object';
import { ConfigBase } from './config';

export { DocTable };

export interface Props {
  model: DocTable;
}

export interface State {
  editRow?: number;
  editCol?: number;
}

export class DocTableView extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  getRender(): RenderListModel {
    return this.props.model.getRender();
  }

  selectRow = () => {
    console.log('sel-row', this.getRender().getSelRow());
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.subscriber);
    this.getRender().subscribe(this.selectRow, 'select-row');
    this.updateModel();
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.subscriber);
    this.getRender().unsubscribe(this.selectRow, 'select-row');
  }

  updateModel() {
    const model = this.getRender();
    const update = () => {
      this.updateModel();
      model.reload();
      model.notify();
    };

    model.setItemsCount(this.props.model.getTotalRowsNum());
    model.setColumns(this.props.model.getColumns().map((col, c) => {
      return {
        name: col.name,
        /*renderHeader: (jsx: JSX.Element) => {
          return (
            <div onContextMenu={evt => {
              const items = [
                <MenuItem
                  key='hc'
                  text={`hide column "${col.name}"`}
                  onClick={() => {
                    const cols = this.props.model.getColumns().map(col => col.name).filter(c => c != col.name);
                    this.props.model.updateSubtable({
                      cols,
                      sort: null
                    }).then(update);
                  }}
                />,
                <MenuItem
                  key='all'
                  text='show all column'
                  onClick={() => {
                    const cols = this.props.model.getAllColumns().map(col => col.name);
                    this.props.model.updateSubtable({
                      cols
                    }).then(update);
                  }}
                />,
                <MenuItem
                  key='sort-asc'
                  text='Sort asc'
                  onClick={() => {
                    this.props.model.updateSubtable({
                      sort: [{ column: col.name, dir: 'asc'} ]
                    }).then(update);
                  }}
                />,
                <MenuItem
                  key='sort-desc'
                  text='Sort desc'
                  onClick={() => {
                    this.props.model.updateSubtable({
                      sort: [{ column: col.name, dir: 'desc'} ]
                    }).then(update);
                  }}
                />,
                <MenuItem
                  key='distinct'
                  text='Distinct'
                  onClick={() => {
                    this.props.model.updateSubtable({ distinct: { column: col.name } }).then(update);
                  }}
                />
              ];

              evt.preventDefault();
              evt.stopPropagation();
              ContextMenu.show(<Menu>{items}</Menu>, {left: evt.clientX, top: evt.clientY});
            }}>{jsx}</div>
          );
        },*/
        render: (args: RenderArgs<Array<string>>) => {
          if (this.state.editRow == args.rowIdx && this.state.editCol == args.colIdx)
            return (
              <input
                defaultValue={args.item[c]}
                ref={el => el && el.focus()}
                onBlur={() => {
                  this.setState({editCol: null, editRow: null});
                }}
              />
            );

          return (
            <div
              onDoubleClick={() => {
                this.setState({editRow: args.rowIdx, editCol: c});
              }}
            >
              {args.item[c]}
            </div>
          );
        }
      };
    }));
  }

  subscriber = () => {
    this.updateModel();
    this.setState({});
  }

  renderTable(): JSX.Element {
    return (
      <FitToParent wrapToFlex>
        <List border model = { this.getRender() } />
      </FitToParent>
    );
  }

  renderInvalid(): JSX.Element {
    const state = this.props.model.getState();
    const stateType = state.getType();
    if (stateType == 'in progress')
      return (
        <div>in progress, {state.getProgress()}</div>
      );

    return (
      <div>not confgured</div>
    );
  }

  renderValid() {
    const model = this.props.model;
    return (
      <React.Fragment>
        <div>table: {model.getTable()}</div>
        <div>rows: {model.getTotalRowsNum()}</div>
        <div>last execute time: {model.getLastExecuteTime()}</div>
        <div>
          <button
            onClick={() => {
              const args: ExecuteArgs = {
                table: model.getTable(),
                fileObjId: model.getFileObjId()
              };

              model.holder.getObject<FileObject>(model.getFileObjId())
              .then((csv: CSVFileObject) => {
                args.columns = csv.getColumns();
                model.execute(args);
              });
            }}
          >
            execute
          </button>
        </div>
        {this.renderTable()}
      </React.Fragment>
    );
  }

  render() {
    const model = this.props.model;
    return (
      <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1}}>
        {model.getState().isValid() ? this.renderValid() : this.renderInvalid()}
      </div>
    );
  }
}

export class DocTableConfig extends ConfigBase<DocTableArgs> {
  componentDidMount() {
    this.config.tableName = 'table';
  }

  render() {
    return (
      <div>
        <div>
          table name:
          <input
            defaultValue={this.config.tableName}
            onChange={evt => {
              this.config.tableName = evt.currentTarget.value;
            }}
          />
        </div>
      </div>
    );
  }
}
