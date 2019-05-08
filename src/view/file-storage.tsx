import * as React from 'react';
import { FileStorage, Folder } from '../client/file-storage';
import { Grid, CellProps, HeaderProps } from 'ts-react-ui/grid/grid';
import { Menu, MenuItem, ContextMenu } from 'ts-react-ui/blueprint';
import { prompt } from 'ts-react-ui/prompt';
import { Droppable } from 'ts-react-ui/drag-and-drop';
import { cn } from 'ts-react-ui/common/common';

export {
  FileStorage
};

export interface Props {
  model: FileStorage;
}

export interface State {
  hover?: boolean;
}

const scss = {
  fileStorageView: 'file-storage-view',
  dropOverlay: 'file-storage-view-drop-overlay',
  dropBlock: 'file-storage-view-drop-block',
  folder: 'file-storage-view-folder',
  folderView: 'file-storage-view-folder-view',
  pathStack: 'curr-path-stack',
  folderInStack: 'curr-path-stack-folder'
};

export class FileStorageView extends React.Component<Props, State> {
  state: State = {};

  renderCell = (props: CellProps) => {
    const row = this.props.model.getGrid().getRowOrLoad(props.row);
    if (!row)
      return null;

    if (props.col == 1)
      props.className = 'cell-align-left';

    return (
      <span>{row.cell[props.col]}</span>
    );
  }

  renderHeader = (props: HeaderProps) => {
    return (
      <span>{this.props.model.getColumns()[props.col]}</span>
    );
  }

  renderTable() {
    const grid = this.props.model.getGrid();
    if (!grid)
      return null;

    return (
      <div
        style={{ position: 'relative', flexGrow: 1 }}
        onContextMenu={this.onFilesContextMenu}
      >
        <Grid
          headerBorder
          model={grid}
          renderHeader={this.renderHeader}
          renderCell={this.renderCell}
          onScrollToBottom={() => {
            grid.loadNext();
          }}
        />
      </div>
    );
  }

  renderFolder(args: { folder: string, folderId: string; key: number, hidden?: boolean }) {
    return (
      <div
        key={args.key}
        style={{ visibility: args.hidden ? 'hidden' : null }}
        className={scss.folder}
        onClick={() => this.props.model.openFolder(args.folderId)}
      >
        <i className='fa fa-folder' />{args.folder}
      </div>
    );
  }

  renderFolderView() {
    if (!this.props.model.isShowFolders())
      return null;

    const currPath = [
      { id: 'root', name: 'root' } as Folder,
      ...this.props.model.getCurrPath()
    ];

    const subfolder = this.props.model.getSubfolder();
    return (
      <div className={scss.folderView} onContextMenu={this.onDirContextMenu}>
        <div className={scss.pathStack}>
          {currPath.map((p, k) => {
            let jsx = <span>{p.name}</span>;
            if (k != currPath.length - 1)
              jsx = <>{jsx}<i className='fa fa-arrow-right' /></>;

            return (
              <div
                key={k}
                className={scss.folderInStack}
                onClick={e => {
                  let path = currPath.slice(1, k + 1).map(f => f.id);
                  this.props.model.openPath(path);
                }}
              >
                {jsx}
              </div>
            );
          })}
        </div>
        <div className='horz-panel-1' style={{ padding: 5 }}>
          {subfolder.length == 0 ?
            this.renderFolder({ folder: '!', folderId: '!', key: 0, hidden: true }) :
            subfolder.map((folder, key) => {
              return this.renderFolder({
                folder: folder.name,
                folderId: folder.id,
                key
              });
            })
          }
        </div>
      </div>
    );
  }

  onFilesContextMenu = (evt: React.MouseEvent) => {
    if (!this.props.model.getSelectCount())
      return;

    evt.preventDefault();
    evt.stopPropagation();

    ContextMenu.show(
      <Menu>
        <MenuItem
          text={`delete ${this.props.model.getSelectCount()} files`}
          onClick={() => {
            this.props.model.deleteSelected();
          }}
        />
      </Menu>,
      { left: evt.pageX, top: evt.pageY }
    );
  }

  onDirContextMenu = (evt: React.MouseEvent) => {
    evt.preventDefault();
    evt.stopPropagation();

    ContextMenu.show(
      <Menu>
        <MenuItem
          text='create folder'
          onClick={() => {
            prompt({ title: 'create new folder', placeholder: 'folder name' })
              .then(name => this.props.model.createFolder({
                path: this.props.model.getCurrPath().map(f => f.id),
                name
              }));
          }}
        />
      </Menu>,
      { left: evt.pageX, top: evt.pageY }
    )
  }

  renderDNDOverlay() {
    const m = this.props.model;
    return (
      <div className={cn(scss.dropOverlay, 'horz-panel-1')} style={{ display: this.state.hover ? null : 'none' }}>
        <Droppable
          onDragEnter={() => {
            this.setState({ hover: true });
          }}
          onDragLeave={() => {
            this.setState({ hover: false });
          }}
          onDrop={args => {
            const fileObjId = args.dragData['id'];
            m.copyFileObject({ fileObjId, path: m.getCurrPath().map(p => p.id) });
            this.setState({ hover: false });
          }}
        >
          <div className={scss.dropBlock}>
            append new file
          </div>
        </Droppable>
        <Droppable
          onDragEnter={() => {
            this.setState({ hover: true });
          }}
          onDragLeave={() => {
            this.setState({ hover: false });
          }}
          onDrop={() => {
            this.setState({ hover: false });
          }}
        >
          <div className={scss.dropBlock} style={{ display: m.getSelectCount() == 1 ? null : 'none' }}>
            replace selected file
          </div>
        </Droppable>
      </div>
    );
  }

  render() {
    const model = this.props.model;
    let jsx: React.ReactChild;
    if (model.getStatus() == 'not configured')
      jsx = 'not configured';
    else
      jsx = this.renderTable();

    return (
      <Droppable
        holder
        onDragEnter={() => {
          this.setState({ hover: true });
        }}
        onDragLeave={() => {
          this.setState({ hover: false });
        }}
        onDrop={() => {
          this.setState({ hover: false });
        }}
      >
        <div className={scss.fileStorageView} key={model.holder.getID()}>
          {this.renderFolderView()}
          <div style={{ display: 'flex', flexGrow: 1, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, display: 'flex' }}>
              {jsx}
            </div>
          </div>
          {this.renderDNDOverlay()}
        </div>
      </Droppable>
    );
  }
}
