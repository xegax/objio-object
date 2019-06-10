import * as React from 'react';
import {
  DatabaseTableBase,
  TableData,
  ObjProps,
  SetTableNameArgs
} from '../../base/database/database-table';
import {
  PropsGroup,
  DropDownPropItem,
  PropItem
} from 'ts-react-ui/prop-sheet';
import { DatabaseHolder } from './database-holder';
import { IDArgs } from '../../common/interfaces';
import { DatabaseHolderBase } from '../../base/database/database-holder';
import {
  TableGuid,
  LoadTableGuidArgs,
  LoadTableGuidResult,
  LoadTableDataArgs
} from '../../base/database/database-holder-decl';
import {
  PushDataArgs,
  PushDataResult,
  TableDesc,
  LoadTableDataResult
} from '../../base/database/database-decl';
import { CSVTableFile, JSONTableFile } from '../table-file/index';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { GridLoadableModel } from 'ts-react-ui/grid/grid-loadable-model';
import { ObjLink } from '../../control/obj-link';

export class DatabaseTable extends DatabaseTableBase {
  private grid: GridLoadableModel;
  private prevDB: DatabaseHolderBase;
  private tables = Array<string>();
  private tableDesc: TableDesc;
  private guid: string;

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
    this.loadTableTask = this.loadTableGuid({ table: this.tableName, desc: true })
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

  pushData(args: PushDataArgs): Promise<PushDataResult> {
    return this.holder.invokeMethod({ method: 'pushData', args });
  }

  loadTableFile(args: IDArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'loadTableFile', args });
  }

  loadTableGuid(args: LoadTableGuidArgs): Promise<LoadTableGuidResult> {
    return this.holder.invokeMethod<LoadTableGuidResult>({ method: 'loadTableGuid', args });
  }

  loadTableRowsNum(args: TableGuid): Promise<number> {
    return this.holder.invokeMethod<number>({ method: 'loadTableRowsNum', args });
  }

  loadTableData(args: LoadTableDataArgs): Promise<LoadTableDataResult> {
    return this.holder.invokeMethod<TableData>({ method: 'loadTableData', args });
  }

  setDatabase(args: IDArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'setDatabase', args });
  }

  setTableName(args: SetTableNameArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'setTableName', args });
  }

  setTableFile(args: IDArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'setTableFile', args });
  }

  isTableValid() {
    return this.tableName && this.tableDesc;
  }

  getObjPropGroups(props: ObjProps) {
    return (
      <PropsGroup label='config' defaultHeight={200} key={this.holder.getID()}>
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
}
