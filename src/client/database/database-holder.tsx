import * as React from 'react';
import { TableDesc } from '../../base/database/database-decl';
import { DatabaseHolderClientBase } from '../../base/database/database-holder';
import { PropsGroup } from 'ts-react-ui/prop-sheet';
import { DropDown, Item as DDItem } from 'ts-react-ui/drop-down';
import { ForwardProps } from 'ts-react-ui/forward-props';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { ObjProps } from '../../base/object-base';
import { prompt, confirm, Intent } from 'ts-react-ui/prompt';
import { GridLoadableModel } from 'ts-react-ui/grid/grid-loadable-model';
import { ObjLink } from '../../control/obj-link';

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
  private updateTablesTask: Promise<any>;
  private selectTable: SelectTableInfo;
  private grid: GridLoadableModel;

  constructor(args) {
    super(args);

    this.holder.addEventHandler({
      onObjChange: () => {
        this.updateDBList();
        this.updateTables();
        this.holder.delayedNotify();
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
    if (this.isRemote() && !this.getDatabase())
      return;

    if (this.updateTablesTask)
      this.updateTablesTask.cancel();

    this.updateTablesTask = (
      this.loadTableList()
      .then(tables => {
        this.updateTablesTask = null;
        this.tables = tables || [];

        if (this.selectTable) {
          this.tables.find(table => {
            return table.table == this.selectTable.tableName;
          });
        }

        this.holder.delayedNotify();
      })
      .catch(err => {
        this.selectTable = null;
        this.tables = [];
        this.updateTablesTask = null;
        this.holder.delayedNotify();
      })
    );

    return this.updateTablesTask;
  }

  private getTableValues(): Array<TableItem> {
    if (!this.tables) {
      this.updateTablesTask == null && this.updateTables();
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

  getSelectTable(): SelectTableInfo {
    return this.selectTable;
  }

  renderRemoteProps(props: ObjProps) {
    if (!this.isRemote())
      return null;

    const conn = this.getConnection();
    const db = this.getDatabase();
    const connArr = props.objects(this.getConnClasses()).map(prov => {
      const obj = prov();
      return {
        value: obj.id,
        render: obj.name
      };
    });

    return (
      <>
        <div className='horz-panel-1 flexrow' style={{ alignItems: 'center' }}>
          <ObjLink
            objId={conn ? conn.getID() : null}
            className='fa fa-plug'
            title='connection'
            style={{ width: '1em' }}
          />
          <DropDown
            style={{ flexGrow: 1 }}
            value={conn ? { value: conn.getID() } : DropDown.NOTHING_SELECT}
            values={connArr}
            onSelect={c => {
              this.setConnection({ id: c.value });
            }}
          />
        </div>
        <div className='horz-panel-1 flexrow' style={{ alignItems: 'center' }}>
          <i
            className='fa fa-database'
            title='database'
            style={{ width: '1em' }}
          />
          <DropDown
            disabled={!!this.updateTablesTask}
            style={{ flexGrow: 1 }}
            value={db ? { value: db } : DropDown.NOTHING_SELECT}
            values={this.dbList.map(db => {
              return {
                value: db
              };
            })}
            onSelect={db => {
              this.setDatabase(db.value);
              this.setTable(null);
              this.tables = null;
              this.holder.delayedNotify();
            }}
          />
          <CheckIcon
            title='Create new database'
            showOnHover
            value
            faIcon='fa fa-plus'
            onClick={() => {
              prompt({ title: 'Create new database', placeholder: 'database name' })
              .then(database => {
                this.createDatabase(database)
                .then(() => {
                  this.tables = null;
                  this.setTable(null);
                  this.setDatabase(database);
                });
              });
            }}
          />
          {db && <CheckIcon
            title='Delete database'
            showOnHover
            value
            faIcon='fa fa-trash'
            onClick={() => {
              confirm({ body: `Are you sure to delete database "${db}" ?`, intent: Intent.WARNING })
              .then(() => {
                this.deleteDatabase(this.getDatabase());
              });
            }}
          />}
        </div>
      </>
    );
  }

  private setTable(tableName: string): boolean {
    if (!this.tables)
      return false;

    const table = this.tables.find(item => item.table == tableName);
    if (!table) {
      this.selectTable = null;
      this.holder.delayedNotify();
      return true;
    }

    // nothing changed
    if (this.selectTable && this.selectTable.tableName == table.table)
      return false;

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
      <PropsGroup label='Tables' defaultHeight={200} key={this.holder.getID()}>
        <ForwardProps
          render={(props: { height?: number }) => {
            return (
              <div className='vert-panel-1 flexcol flexgrow1' style={{ height: props.height }}>
                {this.renderRemoteProps(objProps)}
                <div className='horz-panel-1 flexrow' style={{ alignItems: 'center' }}>
                  <i
                    className={this.updateTablesTask ? 'fa fa-spinner fa-spin' : 'fa fa-table'}
                    title='Table'
                    style={{ width: '1em' }}
                  />
                  <DropDown
                    style={{ flexGrow: 1 }}
                    value={this.selectTable ? { value: this.selectTable.tableName } : DropDown.NOTHING_SELECT}
                    values={this.getTableValues()}
                    onSelect={sel => {
                      this.setTable(sel.value);
                    }}
                  />
                  <CheckIcon
                    title='Import table'
                    showOnHover
                    value
                    faIcon='fa fa-plus'
                    onClick={() => {
                    }}
                  />
                  <CheckIcon
                    title='Delete table'
                    showOnHover
                    value={this.selectTable != null}
                    faIcon='fa fa-trash'
                    onClick={() => {
                      if (!this.selectTable)
                        return;

                      confirm({
                        body: `Are you sure to delete table "${this.selectTable.tableName}" ?`,
                        intent: Intent.WARNING
                      })
                      .then(() => this.deleteTable({ table: this.selectTable.tableName }))
                      .then(() => {
                        this.selectTable = null;
                        this.holder.delayedNotify();
                      });
                    }}
                  />
                </div>
              </div>
            );
          }}
        />
      </PropsGroup>
    );
  }
}
