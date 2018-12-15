import { ObjectBase } from '../base/object-base';
import { Database } from './database';
import { SERIALIZER } from 'objio';
import { Table } from './table';
import { RenderListModel } from 'ts-react-ui/model/list';
import { Cancelable, ExtPromise } from 'objio';
import { ColumnAttr } from '../base/table';

export interface SendFileArgs {
  file: File;
  onProgress?(value: number): void;
}

export interface FilesContainerArgs {
  source: Database;
}

export interface Loading {
  progress: number;
  name: string;
  loading: boolean;
}

export interface FileItem {
  url: string;
  ext: string;
  size: number;
  id: string;
  name: string;
}

export class FilesContainer extends ObjectBase {
  protected table: Table;
  protected database: Database;
  private render = new RenderListModel(0, 20);
  private lastLoadTimer: Cancelable;
  private maxTimeBetweenRequests: number = 0;
  private selectedUrl: string;
  protected loading: Loading = { progress: 1, name: '', loading: false };
  private remoteSelect: Array<FileItem> = [];

  constructor(args?: FilesContainerArgs) {
    super();

    if (args) {
      this.database = args.source;
    }

    this.holder.addEventHandler({
      onLoad: () => {
        this.render.subscribe(() => {
          this.remoteSelect = [];
          const item = this.getItem(this.render.getSelRow());
          if (!item)
            return this.holder.save();

          this.remoteSelect = [ {...item} ];
          this.holder.save();

          this.selectedUrl = this.getPath(item.url);
          this.holder.delayedNotify();
        }, 'select-row');

        this.table.holder.addEventHandler({
          onObjChange: () => {
            this.holder.delayedNotify();
          }
        });

        return Promise.resolve();
      }
    });

    this.render.setHandler({
      loadItems: (from, count) => {
        if (this.lastLoadTimer) {
          this.lastLoadTimer.cancel();
          this.lastLoadTimer = null;
        }

        this.lastLoadTimer = ExtPromise().cancelable( ExtPromise().timer(this.maxTimeBetweenRequests) );
        this.maxTimeBetweenRequests = 300;
        return this.lastLoadTimer.then(() => {
          this.lastLoadTimer = null;
          return this.table.loadCells({ first: from, count });
        });
      }
    });
  }

  sendFile(args: SendFileArgs): Promise<any> {
    return this.holder.invokeMethod({
      method: 'send-file',
      args: args.file,
      onProgress: args.onProgress
    });
  }

  getDirPath(): string {
    return 'files_container_' + this.holder.getID();
  }

  selectNextFile(ext?: string): boolean {
    let selRow = this.render.getSelRow() + 1;
    if (selRow >= this.render.getItemsCount())
      selRow = 0;

    this.remoteSelect = [];
    for (let n = selRow; n < this.render.getItemsCount(); n++) {
      const item = this.getItem(n);
      if (!item) {
        this.holder.save();
        return false;
      }

      if (ext && item.ext.toLowerCase() != ext)
        continue;

      this.remoteSelect = [ {...item} ];
      this.holder.save();
      this.render.setSelRow(n);
      return true;
    }

    return false;
  }

  getItem(n: number): FileItem {
    const rows = this.render.getItems(n, 1);
    if (!rows)
      return null;

    const row = rows[0];
    return {
      id: row[0],
      name: row[1],
      ext: row[2],
      size: +row[3],
      url: row[4]
    };
  }

  getPath(file: string) {
    return this.holder.getPublicPath([this.getDirPath(), file].join('/'));
  }

  getSelectedUrl() {
    return this.selectedUrl;
  }

  getRemoteSelect(): Array<FileItem> {
    return this.remoteSelect;
  }

  setNextRequestDelay(delay: number) {
    this.maxTimeBetweenRequests = delay;
  }

  getFilesCount(): number {
    if (!this.table)
      return 0;

    return this.table.getTotalRowsNum();
  }

  getRender(): RenderListModel {
    return this.render;
  }

  getColumns(): Array<ColumnAttr> {
    if (!this.table)
      return [];

    return this.table.getColumns();
  }

  getUserProgress(userId?: string): Loading {
    return { ...this.loading };
  }

  static TYPE_ID = 'FilesContainer';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    database:     { type: 'object'  },
    table:        { type: 'object'  },
    loading:      { type: 'json'    },
    remoteSelect: { type: 'json'    }
  })
}
