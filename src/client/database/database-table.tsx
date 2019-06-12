import * as React from 'react';
import {
  DatabaseTableClientBase,
  ObjProps
} from '../../base/database/database-table';
import {
  PropsGroup,
  DropDownPropItem,
  PropItem
} from 'ts-react-ui/prop-sheet';
import { DatabaseHolder } from './database-holder';
import { DatabaseHolderBase } from '../../base/database/database-holder';
import { TableDesc } from '../../base/database/database-decl';
import { TableColumn } from '../../base/database/database-table-decl';
import { CSVTableFile, JSONTableFile } from '../table-file/index';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { GridLoadableModel } from 'ts-react-ui/grid/grid-loadable-model';
import { ObjLink } from '../../control/obj-link';
import { ForwardProps } from 'ts-react-ui/forward-props';
import { ListView, Item } from 'ts-react-ui/list-view';
import { FitToParent } from 'ts-react-ui/fittoparent';

interface ColumnItem extends Item {
}

export class DatabaseTable extends DatabaseTableClientBase {
  private grid: GridLoadableModel;
  private prevDB: DatabaseHolderBase;
  private tables = Array<string>();
  private tableDesc: TableDesc;
  private guid: string;
  private modifiedCols: {[col: string]: Partial<TableColumn>} = {};

  private dbChangeHandler = {
    onObjChange: () => {
      this.updateDatabaseData();
      this.grid && this.grid.reloadCurrent();
    }
  };

  constructor() {
    super();

    this.holder.addEventHandler({
      onLoad: () => {
        this.onChangeOrLoad();
        this.updateDatabaseData();
        return Promise.resolve();
      },
      onObjChange: this.onChangeOrLoad
    });
  }

  getGrid(): GridLoadableModel {
    return this.grid;
  }

  private applyColsTask: Promise<void>;

  private onApplyColumns() {
    if (this.applyColsTask)
      return;

    this.applyColsTask = this.modifyColumns(this.modifiedCols)
    .then(() => {
      this.applyColsTask = null;
      this.modifiedCols = {};
    });
  }

  private onChangeOrLoad = () => {
    // database can be changed
    if (this.prevDB)
      this.prevDB.holder.removeEventHandler(this.dbChangeHandler);

    this.prevDB = this.db;
    if (!this.db)
      return Promise.resolve();

    this.db.holder.addEventHandler(this.dbChangeHandler);
    this.loadTableDataImpl();

    return Promise.resolve();
  }

  private loadTableTask: Promise<void>;

  private loadTableDataImpl(): Promise<void> {
    if (!this.tableName || this.getStatus() != 'ok')
      return Promise.resolve();

    if (this.loadTableTask)
      return this.loadTableTask;

    this.tableDesc = null;
    let columns = this.columns.filter(c => c.show).map(c => c.column);
    this.loadTableTask = this.loadTableGuid({ table: this.tableName, desc: true, columns })
    .then(table => {
      this.loadTableTask = null;

      this.tableDesc = {
        ...table.desc,
        table: this.tableName
      };
      this.guid = table.guid;

      this.grid = new GridLoadableModel({
        rowsCount: table.desc.rowsNum,
        colsCount: table.desc.columns.length,
        prev: this.grid
      });

      this.grid.setLoader((from, count) => {
        return (
          this.loadTableData({ guid: this.guid, from, count })
          .then(res => {
            return res.rows.map(obj => ({ obj }));
          })
        );
      });

      this.holder.delayedNotify();
    })
    .catch(e => {
      this.loadTableTask = null;
      return Promise.reject(e);
    });

    return this.loadTableTask;
  }

  private updateDatabaseData() {
    if (!this.db)
      return;

    this.db.loadTableList()
    .then(lst => {
      this.tables = lst.map(t => t.table);
      this.holder.delayedNotify();
    });
  }

  getTableInfo(): TableDesc {
    if (this.status != 'ok')
      return null;
    return this.tableDesc;
  }

  isTableValid() {
    return this.tableName && this.tableDesc;
  }

  private renderBaseConfig(props: ObjProps) {
    return (
      <PropsGroup label='config' key={'base-' + this.holder.getID()}>
        <DropDownPropItem
          left={[
            <ObjLink
              objId={this.db ? this.db.getID() : null}
              className='fa fa-database'
              title='database'
              style={{ width: '1em', textAlign: 'center' }}
            />
          ]}
          value={this.db ? { value: this.db.getID(), render: this.db.getName() } : null}
          values={props.objects([DatabaseHolder]).map(db => {
            return {
              value: db.getID(),
              render: db.getName()
            };
          })}
          onSelect={db => {
            this.setDatabase({ id: db.value });
          }}
        />
        <DropDownPropItem
          left={[
            <i className='fa fa-table' title='table' style={{ width: '1em', textAlign: 'center' }} />
          ]}
          value={{
            value: this.tableName,
            render: () => {
              if (this.tableName && !this.tableDesc)
                return <span style={{ color: 'red' }}>{this.tableName}</span>;

              return <span>{this.tableName}</span>;
            }
          }}
          values={
            [
              ...[
                {
                  value: null,
                  render: <span style={{ color: 'gray ' }}>not selected</span>
                }
              ],
              ...this.tables.map(value => ({ value }))
            ]
          }
          onSelect={table => {
            this.setTableName({ tableName: table.value });
          }}
        />
        <PropItem
          label='rows'
          value={this.tableDesc ? this.tableDesc.rowsNum : '?'}
        />
        <DropDownPropItem
          right={[
            <CheckIcon
              showOnHover
              faIcon='fa fa-upload'
              value={this.tableFileId != null}
              onClick={() => {
                if (!this.tableFileId)
                  return;

                this.loadTableFile({ id: this.tableFileId });
              }}
            />
          ]}
          label='file'
          value={{ value: this.tableFileId }}
          values={props.objects([CSVTableFile, JSONTableFile]).map(item => {
            return {
              value: item.getID(),
              render: item.getName()
            };
          })}
          onSelect={file => {
            this.setTableFile({ id: file.value });
          }}
        />
      </PropsGroup>
    );
  }

  private renderColumnItem = (c: Partial<TableColumn>): Item => {
    let mc = {...c, ...this.modifiedCols[c.column]};
    return {
      value: c.column,
      render: () => {
        return (
          <div className='horz-panel-1'>
            <CheckIcon
              showOnHover
              value
              faIcon={mc.show ? 'fa fa-check-square-o' : 'fa fa-square-o'}
              onClick={() => {
                const newc = this.modifiedCols[c.column] || (this.modifiedCols[c.column]={ show: c.show });
                newc.show = !newc.show;

                this.holder.delayedNotify();
              }}
            />
            <span style={{ color: mc.show ? null : 'silver' }}>{c.column}</span>
          </div>
        );
      }
    };
  }

  private renderColumnsConfig(props: ObjProps) {
    return (
      <PropsGroup label='columns' defaultOpen={false} defaultHeight={this.columns.length ? 200 : null} key={'cols-' + this.holder.getID()}>
        <ForwardProps render={(p: { height?: number }) =>
          <div className='vert-panel-1 flexcol flexgrow1' style={{ height: p.height }}>
            {this.renderColumnsView(props)}
          </div>
        }/>
      </PropsGroup>
    );
  }

  private renderColumnsView(props: ObjProps) {
    const cols = this.columns;
    if (!cols.length) {
      return (
        <div>nothing to display</div>
      );
    }

    let apply = (
      <>
        <CheckIcon
          title='apply'
          style={{ color: 'green' }}
          faIcon='fa fa-check-circle'
          value
        />
        <span>Apply</span>
      </>
    );

    if (Object.keys(this.modifiedCols).length) {
      apply = (
        <a className='horz-panel-1' onClick={() => this.onApplyColumns()}>
          {apply}
        </a>
      );
    } else {
      apply = <span className='horz-panel-1' style={{ color: 'silver' }}>{apply}</span>
    }

    return (
      <>
        <FitToParent wrapToFlex
          render={(w, h) =>
            <ListView
              height={h}
              border={false}
              onSelect={s => {}}
              values={cols.map(this.renderColumnItem)}
            />
          }
        />
        <div className='horz-panel-1' style={{ textAlign: 'center', flexGrow: 0 }}>
          {apply}
        </div>
      </>
    );
  }

  getObjPropGroups(props: ObjProps) {
    return (
      <>
        {this.renderBaseConfig(props)}
        {this.renderColumnsConfig(props)}
      </>
    );
  }
}
