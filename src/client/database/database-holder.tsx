import * as React from 'react';
import {
  DatabaseHolderBase,
  TableInfo,
  ColumnInfo,
  DeleteTableArgs,
  CreateTableArgs,
  PushDataArgs,
  PushDataResult
} from '../../base/database-holder';
import { PropsGroup, DropDownPropItem } from 'ts-react-ui/prop-sheet';
import { ListView, Item as LVItem } from 'ts-react-ui/list-view';
import { DropDown, Item as DDItem } from 'ts-react-ui/drop-down';
import { ForwardProps } from 'ts-react-ui/forward-props';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { ObjProps } from '../../base/object-base';
import { IDArgs } from '../../common/interfaces';

interface TableItem extends DDItem {
  table: TableInfo;
}

interface TableInfoExt extends TableInfo {
  columnsToShow?: Array<ColumnInfo>;
  changed?: boolean;
}

const MAX_COLUMN_TO_SHOW = 10;

export class DatabaseHolder extends DatabaseHolderBase {
  private dbList: Array<string> = [];
  private tables: Array<TableInfoExt> = null;
  private updateTask: Promise<any>;
  private selectTable: TableInfoExt;
  private tmpTableMap: {[table: string]: Promise<TableInfo> | TableInfo} = {};

  constructor(args) {
    super(args);

    this.holder.addEventHandler({
      onObjChange: () => {
        this.updateDBList();
        this.updateTables();
      },
      onLoad: () => {
        this.updateDBList();
        return Promise.resolve();
      }
    });
  }

  deleteTable(args: DeleteTableArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'deleteTable', args });
  }

  createTable(args: CreateTableArgs): Promise<TableInfo> {
    return this.holder.invokeMethod({ method: 'createTable', args });
  }

  setDatabase(database: string): Promise<void> {
    return this.holder.invokeMethod({ method: 'setDatabase', args: { database }});
  }

  setConnection(args: IDArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'setConnection', args });
  }

  pushData(args: PushDataArgs): Promise<PushDataResult> {
    return this.holder.invokeMethod({ method: 'pushData', args });
  }

  protected updateDBList() {
    if (!this.isRemote())
      return;

    this.getDatabaseList()
    .then(lst => {
      this.dbList = lst;
      this.holder.delayedNotify();
    });
  }

  protected updateTables() {
    if (this.updateTask)
      this.updateTask.cancel();

    this.updateTask = (
      this.impl.loadTableList()
        .then(tables => {
          this.updateTask = null;
          this.tables = tables;
          this.tables.forEach(table => {
            if (!table.columnsToShow)
              table.columnsToShow = table.columns.slice(0, MAX_COLUMN_TO_SHOW);
          });

          if (this.selectTable) {
            this.selectTable = this.tables.find(table => {
              return table.tableName == this.selectTable.tableName;
            });
          }

          this.holder.delayedNotify();
        })
    );

    return this.updateTask;
  }

  private getTableValues(): Array<TableItem> {
    if (!this.tables) {
      this.updateTask == null && this.updateTables();
      return [];
    }

    return (
      this.tables.map(table => {
        return {
          title: `rows: ${table.rowsNum}\ncolumns: ${table.columns.length}`,
          value: table.tableName,
          render: table.tableName,
          table
        };
      })
    );
  }

  private updateColumnsToShow() {
    const s = new Set<ColumnInfo>(this.selectTable.columnsToShow);
    this.selectTable.columnsToShow = this.selectTable.columns.filter(col => {
      return s.has(col);
    });
  }

  private toggleColumn(col: ColumnInfo) {
    const idx = this.selectTable.columnsToShow.indexOf(col);
    if (idx != -1)
      this.selectTable.columnsToShow.splice(idx, 1);
    else
      this.selectTable.columnsToShow.push(col);

    this.updateColumnsToShow();
    this.selectTable.changed = true;
    this.holder.delayedNotify({});
  }

  private getColumnValues(): Array<LVItem> {
    if (!this.selectTable)
      return [];

    return (
      this.selectTable.columns.map((col, i) => {
        return {
          value: '' + i,
          title: col.colName,
          render: () => {
            let shown = false;
            if (this.selectTable && this.selectTable.columnsToShow)
              shown = this.selectTable.columnsToShow.indexOf(col) != -1;

            return (
              <div className='horz-panel-1'>
                <CheckIcon
                  faIcon={shown ? 'fa fa-check-square-o' : 'fa fa-square-o'}
                  value
                  showOnHover
                  onClick={() => this.toggleColumn(col)}
                />
                <span style={{ color: shown ? undefined : 'gray' }}>
                  {col.colName}
                </span>
              </div>
            );
          }
        };
      })
    );
  }

  getSelectTable(): TableInfo | Promise<TableInfo> {
    if (!this.selectTable)
      return null;

    return this.tmpTableMap[this.selectTable.tableName] || this.selectTable;
  }

  private updateTmpTable(): Promise<TableInfo> {
    const tableName = this.selectTable.tableName;
    const task = this.tmpTableMap[tableName] = this.createTempTable({
      tableName,
      columns: this.selectTable.columnsToShow.map(c => c.colName)
    }).then(tmpTable => {
      this.tmpTableMap[tableName] = tmpTable;
      this.holder.delayedNotify({ type: 'reload' });
      return tmpTable;
    }).catch(e => {
      this.holder.delayedNotify();
      return Promise.reject(e);
    });

    return task;
  }

  renderHeader = (props: LVItem) => {
    return (
      <div className='horz-panel-1'>
        <span>{props.value}</span>
        <CheckIcon
          faIcon='fa fa-thumbs-o-up'
          value={this.selectTable ? this.selectTable.changed : false}
          onClick={() => {
            if (!this.selectTable)
              return;

            this.selectTable.changed = false;
            this.holder.delayedNotify({ type: 'columns' });
            this.updateTmpTable();
          }}
        />
      </div>
    );
  };

  renderRemoteProps(props: ObjProps) {
    if (!this.isRemote())
      return null;

    const conn = this.getConnection();
    const db = this.getDatabase();
    return (
      <>
        <div className='horz-panel-1 flexrow' style={{ alignItems: 'center' }}>
          <div>connection:</div>
          <DropDown
            style={{ flexGrow: 1 }}
            value={conn ? { value: conn.getID() } : null}
            values={props.objects( this.getConnClasses() ).map(c => {
              return {
                value: c.getID(),
                render: c.getName()
              };
            })}
            onSelect={c => {
              this.setConnection({ id: c.value });
            }}
          />
        </div>
        <div className='horz-panel-1 flexrow' style={{ alignItems: 'center' }}>
          <div>db:</div>
          <DropDown
            style={{ flexGrow: 1 }}
            value={db ? { value: db } : null}
            values={this.dbList.map(db => {
              return {
                value: db
              };
            })}
            onSelect={db => {
              this.setDatabase(db.value);
              this.tables = null;
              this.holder.delayedNotify();
            }}
          />
        </div>
      </>
    );
  }

  getObjPropGroups(objProps: ObjProps) {
    return (
      <PropsGroup label='tables' defaultHeight={200} key={this.holder.getID()}>
        <ForwardProps
          render={(props: { height?: number }) => {
            return (
              <div className='vert-panel-1 flexcol flexgrow1' style={{ height: props.height }}>
                {this.renderRemoteProps(objProps)}
                <div className='horz-panel-1 flexrow' style={{ alignItems: 'center'}}>
                  <div>table:</div>
                  <DropDown
                    style={{ flexGrow: 1}}
                    value={this.selectTable ? { value: this.selectTable.tableName } : null}
                    values={this.getTableValues()}
                    onSelect={sel => {
                      this.selectTable = this.tables.find(item => item.tableName == sel.value);
                      if (this.selectTable && this.selectTable.columns.length > MAX_COLUMN_TO_SHOW) {
                        this.selectTable.columnsToShow = this.selectTable.columns.slice(0, MAX_COLUMN_TO_SHOW);
                        this.updateTmpTable();
                      }
                      this.holder.delayedNotify();
                    }}
                  />
                  <CheckIcon
                    showOnHover
                    value={this.selectTable != null}
                    faIcon='fa fa-remove'
                    onClick={() => {
                      if (!this.selectTable)
                        return;

                      this.deleteTable({ tableName: this.selectTable.tableName })
                      .then(() => {
                        this.selectTable = null;
                        this.holder.delayedNotify();
                      });
                    }}
                  />
                </div>
                <ListView
                  height={0}
                  style={{ flexGrow: 1 }}
                  border={false}
                  header={{ value: 'Column', render: this.renderHeader }}
                  values={this.getColumnValues()}
                  onMoveTo={args => {
                    this.selectTable.changed = true;
                    const srcIdx = +args.drag[0].value;
                    if (args.before) {
                      const [drag] = this.selectTable.columns.splice(srcIdx, 1);
                      if (srcIdx >= +args.before.value)
                        this.selectTable.columns.splice(+args.before.value, 0, drag);
                      else
                        this.selectTable.columns.splice(+args.before.value - 1, 0, drag);
                      
                      this.updateColumnsToShow();
                      this.holder.delayedNotify({});
                    }
                  }}
                />
              </div>
            );
          }}
        />
      </PropsGroup>
    );
  }
}
