import * as React from 'react';
import { GuidMapData } from '../../base/database/database-holder-decl';
import { TableDesc, TableDescShort } from '../../base/database/database-decl';
import { DatabaseHolderClientBase } from '../../base/database/database-holder';
import { PropsGroup } from 'ts-react-ui/prop-sheet';
import { ListView, Item as LVItem } from 'ts-react-ui/list-view';
import { DropDown, Item as DDItem } from 'ts-react-ui/drop-down';
import { ForwardProps } from 'ts-react-ui/forward-props';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { ObjProps } from '../../base/object-base';
import { IDArgs } from '../../common/interfaces';
import { GridLoadableModel } from 'ts-react-ui/grid/grid-loadable-model';

interface TableItem extends DDItem {
}

export interface SelectTableInfo {
  tableName: string;
  guid?: string;
  desc: TableDesc;
}

export class DatabaseHolder extends DatabaseHolderClientBase {
  private dbList: Array<string> = [];
  private tables: Array<TableDesc> = null;
  private updateTask: Promise<any>;
  private selectTable: SelectTableInfo;
  private grid: GridLoadableModel;

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

  getGrid() {
    return this.grid;
  }

  setDatabase(database: string): Promise<void> {
    return this.holder.invokeMethod({ method: 'setDatabase', args: { database } });
  }

  setConnection(args: IDArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'setConnection', args });
  }

  createTempTable(args: GuidMapData): Promise<TableDescShort> {
    return Promise.reject('not implemented');
  }

  protected updateDBList() {
    if (!this.isRemote())
      return;

    this.loadDatabaseList()
      .then(lst => {
        this.dbList = lst;
        this.holder.delayedNotify();
      });
  }

  protected updateTables() {
    if (this.updateTask)
      this.updateTask.cancel();

    this.updateTask = (
      this.loadTableList()
        .then(tables => {
          this.updateTask = null;
          this.tables = tables || [];

          if (this.selectTable) {
            this.tables.find(table => {
              return table.table == this.selectTable.tableName;
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
          value: table.table,
          render: table.table,
          table
        };
      })
    );
  }

  private getColumnValues(): Array<LVItem> {
    if (!this.selectTable)
      return [];

    return (
      this.selectTable.desc.columns.map((col, i) => {
        return {
          value: '' + i,
          title: col.colName,
          render: () => {
            let shown = true;
            return (
              <div className='horz-panel-1'>
                <CheckIcon
                  faIcon={shown ? 'fa fa-check-square-o' : 'fa fa-square-o'}
                  value
                  showOnHover
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

  getSelectTable(): SelectTableInfo {
    return this.selectTable;
  }

  renderHeader = (props: LVItem) => {
    return (
      <div className='horz-panel-1'>
        <span>{props.value}</span>
        <CheckIcon
          faIcon='fa fa-thumbs-o-up'
          value={true}
        />
      </div>
    );
  }

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
            values={props.objects(this.getConnClasses()).map(c => {
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

  private setTable(tableName: string): boolean {
    const table = this.tables.find(item => item.table == tableName);
    // nothing changed
    if (this.selectTable && this.selectTable.tableName == table.table)
      return false;

    if (!table) {
      this.selectTable = null;
      this.holder.delayedNotify();
      return true;
    }

    this.selectTable = {
      tableName: table.table,
      guid: null,
      desc: table
    };

    this.loadTableGuid({ table: table.table, desc: true })
    .then(res => {
      this.selectTable.guid = res.guid;
      this.createGrid();
    });
  }

  private createGrid() {
    const table = this.selectTable.desc;
    this.grid = new GridLoadableModel({
      rowsCount: table.rowsNum,
      colsCount: table.columns.length,
      prev: this.grid
    });

    this.grid.setLoader((from, count) => {
      const table = this.selectTable;
      if (!table)
        return Promise.reject('table not loaded');

      return (
        this.loadTableData({
          guid: table.guid,
          from,
          count
        }).then(res => {
          return res.rows.map(obj => {
            return { cell: table.desc.columns.map(c => obj[c.colName]) };
          });
        })
      );
    });

    this.holder.delayedNotify();
  }

  getObjPropGroups(objProps: ObjProps) {
    return (
      <PropsGroup label='tables' defaultHeight={200} key={this.holder.getID()}>
        <ForwardProps
          render={(props: { height?: number }) => {
            return (
              <div className='vert-panel-1 flexcol flexgrow1' style={{ height: props.height }}>
                {this.renderRemoteProps(objProps)}
                <div className='horz-panel-1 flexrow' style={{ alignItems: 'center' }}>
                  <div>table:</div>
                  <DropDown
                    style={{ flexGrow: 1 }}
                    value={this.selectTable ? { value: this.selectTable.tableName } : null}
                    values={this.getTableValues()}
                    onSelect={sel => {
                      this.setTable(sel.value);
                    }}
                  />
                  <CheckIcon
                    showOnHover
                    value={this.selectTable != null}
                    faIcon='fa fa-remove'
                    onClick={() => {
                      if (!this.selectTable)
                        return;

                      this.deleteTable({ table: this.selectTable.tableName })
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
                    /*this.selectTable.changed = true;
                    const srcIdx = +args.drag[0].value;
                    if (args.before) {
                      const [drag] = this.selectTable.columns.splice(srcIdx, 1);
                      if (srcIdx >= +args.before.value)
                        this.selectTable.columns.splice(+args.before.value, 0, drag);
                      else
                        this.selectTable.columns.splice(+args.before.value - 1, 0, drag);

                      this.updateColumnsToShow();
                      this.holder.delayedNotify({});
                    }*/
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
