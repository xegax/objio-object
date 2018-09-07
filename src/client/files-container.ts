import { ObjectBase } from './object-base';
import { Database } from './database';
import { SERIALIZER } from 'objio';
import { Table } from './table';
import { RenderListModel } from 'ts-react-ui/model/list';
import { timer, cancelable, Cancelable } from 'objio/common/promise';
import { ColumnAttr } from './table';

export interface FilesContainerArgs {
  source: Database;
}

export interface Loading {
  progress: number;
  name: string;
  loading: boolean;
}

export class FilesContainer extends ObjectBase {
  protected table: Table;
  protected database: Database;
  private render = new RenderListModel(0, 20);
  private lastLoadTimer: Cancelable;
  private maxTimeBetweenRequests: number = 0;
  private selectedUrl: string;
  protected loading: Loading = { progress: 1, name: '', loading: false };

  constructor(args?: FilesContainerArgs) {
    super();

    if (args) {
      this.database = args.source;
    }

    this.holder.addEventHandler({
      onLoad: () => {
        this.render.subscribe(() => {
          const rows = this.render.getItems(this.render.getSelRow(), 1);
          if (!rows)
            return;
          this.selectedUrl = this.getPath(rows[0][4]);
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

        this.lastLoadTimer = cancelable(timer(this.maxTimeBetweenRequests));
        this.maxTimeBetweenRequests = 300;
        return this.lastLoadTimer.then(() => {
          this.lastLoadTimer = null;
          return this.table.loadCells({ first: from, count });
        });
      }
    });
  }

  sendFile(file: File): Promise<any> {
    return this.holder.invokeMethod('send-file', file);
  }

  getDirPath(): string {
    return 'files_container_' + this.holder.getID();
  }

  getPath(file: string) {
    return this.holder.getFilePath([this.getDirPath(), file].join('/'));
  }

  getSelectedUrl() {
    return this.selectedUrl;
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

  getProgress(userId?: string): Loading {
    return { ...this.loading };
  }

  static TYPE_ID = 'FilesContainer';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    database: { type: 'object' },
    table:    { type: 'object' },
    loading:  { type: 'json' }
  })
}
