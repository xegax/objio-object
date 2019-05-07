import * as React from 'react';
import { ObjProps, SendFileArgs } from '../base/object-base';
import {
  FileStorageBase,
  DeleteArgs,
  LoadStatsResult,
  LoadInfoArgs,
  LoadFolderArgs,
  LoadFolderResult,
  CreateFolderArgs,
  Folder
} from '../base/file-storage';
import { IDArgs } from '../common/interfaces';
import { PropsGroup, DropDownPropItem, PropItem } from 'ts-react-ui/prop-sheet';
import { DatabaseHolder } from './database/database-holder';
import { LoadDataArgs, LoadDataResult, StorageInfo, EntryData } from '../base/file-storage';
import { GridLoadableModel } from 'ts-react-ui/grid/grid-loadable-model';
import { CompoundCond } from '../base/database';

export { Folder };

export class FileStorage extends FileStorageBase {
  private columns: Array<keyof EntryData> = ['rowId', 'name', 'type', 'size'];
  private filesCount: number = 0;
  private prevDB: DatabaseHolder;
  private dbEventHandler = {
    onObjChange: () => this.onObjChanged()
  };
  private selIds: {[row: number]: EntryData} = {}; // [rowIdx] = file entry
  private grid: GridLoadableModel<EntryData>;
  private extFilter: string;
  private extFilterCond: CompoundCond;
  private guid: string;
  private path = Array<Folder>();
  private subfolders = Array<Folder>();

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

  getCurrPath(): Array<Folder> {
    return this.path;
  }

  getSubfolder() {
    return this.subfolders;
  }

  openFolder(subfolderId: string) {
    const nextFolder = this.subfolders.find(f => f.id == subfolderId);
    if (!nextFolder)
      return false;

    const path = [ ...this.path, nextFolder ];
    this.loadFolder({ path: path.map(f => f.id) })
    .then(res => {
      this.path = path;
      this.subfolders = res.subfolder;
      this.onObjChanged();
      this.grid.clearSelect();
      this.holder.delayedNotify();
    });

    return true;
  }

  openPath(path: Array<string>) {
    this.loadFolder({ path })
    .then(res => {
      this.path = res.path;
      this.subfolders = res.subfolder;
      this.onObjChanged();
      this.holder.delayedNotify();
      this.grid.clearSelect();
    });
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
      grid.setColSize(this.columns.indexOf('rowId'), 50);
      grid.setColSize(this.columns.indexOf('size'), 100);
      grid.setColSize(this.columns.indexOf('type'), 80);
    } else {
      this.grid.unsubscribe(this.onSelect, 'select');
    }

    grid.setLoader((from, count) => {
      return this.loadData({ guid: this.guid, from, count })
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

    this.loadInfo({ path: this.path.map(p => p.id) })
    .then(r => {
      this.guid = r.guid;
      this.grid.setRowsCount(r.filesCount);
      if (this.grid.getRowsCount() == 0)
        this.grid.loadNext();
      else
        this.grid.reloadCurrent();

      this.filesCount = r.filesCount;
      this.holder.delayedNotify();
    });

    this.loadFolder({ path: this.path.map(f => f.id) })
    .then(res => {
      this.subfolders = res.subfolder;
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

  loadFolder(args: LoadFolderArgs): Promise<LoadFolderResult> {
    return this.holder.invokeMethod({ method: 'loadFolder', args });
  }

  createFolder(args: CreateFolderArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'createFolder', args });
  }

  loadInfo(args: LoadInfoArgs): Promise<StorageInfo> {
    return this.holder.invokeMethod({ method: 'loadInfo', args });
  }

  loadData(args: LoadDataArgs): Promise<LoadDataResult> {
    return this.holder.invokeMethod({ method: 'loadData', args });
  }

  delete(args: DeleteArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'delete', args });
  }

  loadStats(): Promise<LoadStatsResult> {
    return this.holder.invokeMethod({ method: 'loadStats', args: {} });
  }

  sendFile(args: SendFileArgs): Promise<any> {
    return super.sendFile({...args, other: JSON.stringify(this.path.map(p => p.id)) });
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

  setTypeFilter(type: string) {
    this.extFilter = type;
    if (!type)
      this.extFilterCond = null;
    else
      this.extFilterCond = { op: 'or', values: [{ column: 'type', value: type }] };
    this.onObjChanged();
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
        <DropDownPropItem
          value={{value: this.extFilter}}
          values={['', '.mp3', '.png', '.jpg', '.mp4', '.pdf', '.jpeg', '.torrent', '.zip'].map(t => ({ value: t }))}
          onSelect={s => {
            this.setTypeFilter(s.value);
          }}
        />
      </PropsGroup>
    );
  }
}
