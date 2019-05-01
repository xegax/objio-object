import * as React from 'react';
import {
  TableBase,
  TableArgs,
  TableData,
  TableDataArgs,
  TableInfo,
  TmpTableArgs,
  ObjProps
} from '../../base/database/table2';
import {
  PropsGroup,
  DropDownPropItem,
  PropItem
} from 'ts-react-ui/prop-sheet';
import { DatabaseHolder } from './database-holder';
import { IDArgs } from '../../common/interfaces';
import { DatabaseBase2, PushDataArgs, PushDataResult } from '../../base/database-holder';
import { CSVTableFile, JSONTableFile } from '../table-file/index';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { GridLoadableModel } from 'ts-react-ui/grid/grid-loadable-model';

export class Table2 extends TableBase {
  private grid: GridLoadableModel;
  private prevDB: DatabaseBase2;
  private tables = Array<string>();
  private tableInfo: TableInfo;

  private dbChangeHandler = {
    onObjChange: () => this.updateDatabaseData()
  };

  constructor() {
    super();

    this.holder.addEventHandler({
      onLoad: this.onChangeOrLoad,
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
    this.updateDatabaseData();

    return Promise.resolve();
  }

  private updateDatabaseData() {
    if (this.tableInfo && this.tableName != this.tableInfo.tableName)
      this.tableInfo = null;

    this.db.loadTableList()
      .then(lst => {
        this.tables = lst.map(t => t.tableName);
        this.holder.delayedNotify();
      });

    if (this.tableName && !this.tableInfo) {
      this.db.loadTableInfo({ tableName: this.tableName })
      .then(info => {
        this.onTableSelected(info);
      })
      .catch(e => {
        this.tableInfo = null;
        this.holder.delayedNotify();
        return Promise.reject(e);
      });
    }
  }

  private onTableSelected(table: TableInfo) {
    this.tableInfo = table;
    
    this.grid = new GridLoadableModel({
      rowsCount: table.rowsNum,
      colsCount: table.columns.length,
      prev: this.grid
    });

    this.grid.setLoader((from, count) => {
      return (
        this.loadTableData({
          tableName: table.tableName,
          fromRow: from,
          rowsNum: count
        })
        .then(res => {
          return res.rows.map(obj => ({ obj }));
        })
      );
    });

    this.holder.delayedNotify({});
  }

  getTableInfo(): TableInfo {
    if (this.status != 'ok')
      return null;
    return this.tableInfo;
  }

  pushData(args: PushDataArgs): Promise<PushDataResult> {
    return this.holder.invokeMethod({ method: 'pushData', args });
  }

  loadTableFile(args: IDArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'loadTableFile', args });
  }

  createTempTable(args: TmpTableArgs): Promise<TableInfo> {
    return this.holder.invokeMethod<TableInfo>({ method: 'createTempTable', args });
  }

  loadTableInfo(args: TableArgs): Promise<TableInfo> {
    return this.holder.invokeMethod<TableInfo>({ method: 'loadTableInfo', args });
  }

  loadTableRowsNum(args: TableArgs): Promise<number> {
    return this.holder.invokeMethod<number>({ method: 'loadTableRowsNum', args });
  }

  loadTableData(args: TableDataArgs): Promise<TableData> {
    return this.holder.invokeMethod<TableData>({ method: 'loadTableData', args });
  }

  setDatabase(args: IDArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'setDatabase', args });
  }

  setTableName(args: TableArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'setTableName', args });
  }

  setTableFile(args: IDArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'setTableFile', args });
  }

  isTableValid() {
    return this.tableName && this.tableInfo;
  }

  getObjPropGroups(props: ObjProps) {
    return (
      <PropsGroup label='config' defaultHeight={200} key={this.holder.getID()}>
        <DropDownPropItem
          label='database'
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
          label='table'
          value={{
            value: this.tableName,
            render: () => {
              if (this.tableName && !this.tableInfo)
                return <span style={{ color: 'red' }}>{this.tableName}</span>;

              return <span>{this.tableName}</span>;
            }
          }}
          values={
            [
              ...[
                {
                  value: null,
                  render: <span style={{ color: 'gray '}}>not selected</span>
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
          value={this.tableInfo ? this.tableInfo.rowsNum : '?'}
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
    )
  }
}
