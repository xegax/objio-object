import * as React from 'react';
import { ObjProps } from '../base/object-base';
import { FileStorageBase } from '../base/file-storage';
import { IDArgs } from '../common/interfaces';
import { PropsGroup, DropDownPropItem, PropItem, SwitchPropItem } from 'ts-react-ui/prop-sheet';
import { DatabaseHolder } from './database/database-holder';
import { GridLoadableModel } from 'ts-react-ui/grid/grid-loadable-model';
import {
  DeleteArgs,
  LoadInfoArgs,
  LoadFolderArgs,
  LoadFolderResult,
  CreateFolderArgs,
  Folder,
  LoadDataArgs,
  LoadDataResult,
  StorageInfo,
  EntryData,
  StatInfo,
  CopyFileObjArgs,
  UpdateArgs
} from '../base/file-storage-decl';
import { fmtBytes } from '../common/common';
import { ObjLink } from '../control/obj-link';

export { Folder };

export class FileStorage extends FileStorageBase {
  private columns: Array<keyof EntryData> = ['rowId', 'name', 'type', 'size'];
  
  private currDirFiles: number = 0;
  private totalFiles: number = 0;
  private dirStat: StatInfo;
  private totalStat: StatInfo;
  private showDirs: boolean = true;
  private contentPanel: boolean = false;

  private prevDB: DatabaseHolder;
  private dbEventHandler = {
    onObjChange: () => this.onObjChanged()
  };
  private selIds: {[row: number]: EntryData} = {}; // [rowIdx] = file entry
  private grid: GridLoadableModel<EntryData>;
  private extFilter: string;
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

  getFileDropDest() {
    return this.path.map(p => p.id);
  }

  setContentPanelShow(show: boolean) {
    if (this.contentPanel == show)
      return;

    this.contentPanel = show;
    this.holder.delayedNotify();
  }

  getContentPanelShow() {
    return this.contentPanel;
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
      rowsCount: this.currDirFiles,
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

    this.loadInfo({ path: this.showDirs ? this.path.map(p => p.id) : null, stat: true })
    .then(r => {
      this.guid = r.guid;
      this.grid.setRowsCount(r.filesCount);
      if (this.grid.getRowsCount() == 0)
        this.grid.loadNext();
      else
        this.grid.reloadCurrent();

      this.currDirFiles = r.filesCount;
      this.dirStat = r.stat;
      this.holder.delayedNotify();
    });

    this.loadInfo({ stat: true })
    .then(r => {
      this.totalFiles = r.filesCount;
      this.totalStat = r.stat;
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

  getCurrDirFilesCount(): number {
    return this.currDirFiles;
  }

  getTotalFilesCount(): number {
    return this.totalFiles;
  }

  getSelectCount(): number {
    return this.grid && this.grid.getSelectRows().length;
  }

  getLastSelectFile(): EntryData {
    if (!this.grid)
      return null;

    const rows = this.grid.getSelectRows();
    if (!rows.length)
      return null;

    const row = this.grid.getRowOrLoad(rows[rows.length - 1]);
    if (!row)
      return null;

    return row.obj;
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

  update(args: UpdateArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'update', args });
  }

  copyFileObject(args: CopyFileObjArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'copyFileObject', args });
  }

  /*sendFile(args: SendFileArgs): Promise<any> {
    return super.sendFile({...args, other: JSON.stringify(args.dest) });
  }*/

  setShowFolders(show: boolean) {
    if (this.showDirs == show)
      return;

    this.showDirs = show;
    this.holder.delayedNotify();
  }

  isShowFolders(): boolean {
    return this.showDirs;
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
    this.onObjChanged();
    this.holder.delayedNotify();
  }

  getObjPropGroups(props: ObjProps) {
    return (
      <PropsGroup label='config' key={this.holder.getID()}>
        <DropDownPropItem
          disabled={this.db != null}
          left={[
            <ObjLink
              title='database'
              objId={this.db ? this.db.getID() : null}
              className='fa fa-database'
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
        <SwitchPropItem
          value={this.showDirs}
          label='show folders'
          onChanged={value => {
            this.setShowFolders(value);
            this.onObjChanged();
          }}
        />
        <SwitchPropItem
          value={this.contentPanel}
          label='content panel'
          onChanged={value => {
            this.setContentPanelShow(value);
          }}
        />
        {this.showDirs && <PropItem
          label='files num'
          value={this.currDirFiles}
        />}
        <PropItem
          label='total files num'
          value={this.totalFiles}
        />
        {this.dirStat && this.showDirs && <PropItem
          label='size'
          value={fmtBytes(this.dirStat.sizeSum || 0)}
        />}
        {this.totalStat && <PropItem
          label='total size'
          value={fmtBytes(this.totalStat.sizeSum || 0)}
        />}
      </PropsGroup>
    );
  }
}
