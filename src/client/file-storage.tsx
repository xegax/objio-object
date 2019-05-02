import * as React from 'react';
import { ObjProps } from '../base/object-base';
import { FileStorageBase, DeleteArgs } from '../base/file-storage';
import { IDArgs } from '../common/interfaces';
import { PropsGroup, DropDownPropItem, PropItem } from 'ts-react-ui/prop-sheet';
import { DatabaseHolder } from './database/database-holder';
import { LoadDataArgs, LoadDataResult, StorageInfo, EntryData } from '../base/file-storage';
import { GridLoadableModel } from 'ts-react-ui/grid/grid-loadable-model';

export class FileStorage extends FileStorageBase {
  private columns: Array<keyof EntryData> = ['rowId', 'name', 'type', 'size'];
  private filesCount: number = 0;
  private prevDB: DatabaseHolder;
  private dbEventHandler = {
    onObjChange: () => this.onObjChanged()
  };
  private selIds: {[row: number]: EntryData} = {}; // [rowIdx] = file entry
  private grid: GridLoadableModel<EntryData>;

  constructor() {
    super();

    this.holder.addEventHandler({
      onObjChange: this.onObjChanged,
      onLoad: this.onObjChanged
    });
  }

  getGrid(): GridLoadableModel {
    return this.grid;
  }

  getColumns() {
    return this.columns;
  }

  private makeGrid() {
    const grid = new GridLoadableModel<EntryData>({
      rowsCount: this.filesCount,
      colsCount: this.columns.length,
      prev: this.grid
    });

    if (!this.grid) {
      grid.setReverse(true);
      grid.setSelectType('rows');
    } else {
      this.grid.unsubscribe(this.onSelect, 'select');
    }

    grid.setLoader((from, count) => {
      return this.loadData({ from, count })
      .then(res => {
        return res.files.map(row => ({
          obj: row,
          cell: this.columns.map(key => row[key])
        }));
      });
    });
    grid.subscribe(this.onSelect, 'select');

    this.grid = grid;
  }

  protected onSelect = () => {
    let selIds: {[row: number]: EntryData} = {};
    this.grid.getSelectRows()
    .forEach(r => {
      const row = this.grid.getRow(r);
      if (row)
        selIds[r] = row.obj;
      else
        selIds[r] = this.selIds[r];
    });
    this.selIds = selIds;
    this.holder.delayedNotify();
  };

  private onObjChanged = () => {
    if (this.prevDB != this.db) {
      this.prevDB && this.prevDB.holder.removeEventHandler(this.dbEventHandler);
      this.db && this.db.holder.addEventHandler(this.dbEventHandler);
      this.prevDB = this.db as DatabaseHolder;
      this.makeGrid();
    }

    if (!this.db || !this.fileTable)
      return;

    this.loadInfo()
    .then(r => {
      this.grid.setRowsCount(r.filesCount);
      if (this.grid.getRowsCount() == 0)
        this.grid.loadNext();
      else
        this.grid.reloadCurrent();

      this.filesCount = r.filesCount;
      this.holder.delayedNotify();
    });

    this.holder.delayedNotify();
    return Promise.resolve();
  };

  getFilesCount(): number {
    return this.filesCount;
  }

  setDatabase(args: IDArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'setDatabase', args });
  }

  loadInfo(): Promise<StorageInfo> {
    return this.holder.invokeMethod({ method: 'loadInfo', args: {} });
  }

  loadData(args: LoadDataArgs): Promise<LoadDataResult> {
    return this.holder.invokeMethod({ method: 'loadData', args });
  }

  delete(args: DeleteArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'delete', args });
  }

  deleteSelected = () => {
    if (!this.grid)
      return;

    this.delete({
      fileIds: Object.keys(this.selIds).map(r => this.selIds[+r].fileId)
    });
    this.grid.clearSelect();
    this.holder.delayedNotify();
  }

  getObjPropGroups(props: ObjProps) {
    return (
      <PropsGroup label='config' defaultHeight={200} key={this.holder.getID()}>
        <DropDownPropItem
          disabled={this.db != null}
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
        <PropItem
          label='files num'
          value={this.getFilesCount()}
        />
        <button
          disabled={this.grid == null || this.grid.getSelectRows().length == 0}
          onClick={this.deleteSelected}
        >
          delete
        </button>
      </PropsGroup>
    );
  }
}
