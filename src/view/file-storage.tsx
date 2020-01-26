import * as React from 'react';
import { FileStorage, Folder } from '../client/file-storage';
import { Grid, CellProps, HeaderProps } from 'ts-react-ui/grid/grid';
import { Menu, MenuItem, ContextMenu } from 'ts-react-ui/blueprint';
import { prompt } from 'ts-react-ui/prompt';
import { Droppable } from 'ts-react-ui/drag-and-drop';
import { cn } from 'ts-react-ui/common/common';
import { VerticalResizer } from 'ts-react-ui/resizer';
import { ObjProps } from '../base/object-base';
import { VideoFileObject } from '../view/video-file-view';

export {
  FileStorage
};

export interface Props extends ObjProps {
  model: FileStorage;
}

export interface State {
  hover?: boolean;
  rightPanelSize: number;
}

const scss = {
  fileStorageView: 'file-storage-view',
  dropOverlay: 'file-storage-view-drop-overlay',
  dropBlock: 'file-storage-view-drop-block',
  folder: 'file-storage-view-folder',
  folderView: 'file-storage-view-folder-view',
  folderList: 'file-storage-view-folderlist',
  pathStack: 'curr-path-stack',
  folderInStack: 'curr-path-stack-folder'
};

export class FileStorageView extends React.Component<Props, State> {
  state: State = {
    rightPanelSize: 100
  };

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
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, right: 0, display: 'flex', flexDirection: 'column' }}>
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
          <div className={cn('horz-panel-1', scss.folderList)}>
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
      </div>
    );
  }

  onFilesContextMenu = (evt: React.MouseEvent) => {
    const m = this.props.model;
    const selNum = m.getSelectCount();
    if (!selNum)
      return;

    const sel = m.getLastSelectFile();
    evt.preventDefault();
    evt.stopPropagation();

    ContextMenu.show(
      <Menu>
        {sel && sel.type == '.mp4' && <MenuItem
          text='create object'
          onClick={() => {
            /*let obj = new VideoFileObject({
              name: sel.name,
              size: sel.size,
              mime: 'video/mp4',
              filePath: `${m.holder.getID()}/${sel.fileId.substr(0, sel.fileId.length - sel.type.length)}`
            });
            m.holder.createObject(obj)
            .then(() => this.props.append(obj))
            .then(() => obj.updateDesciption());*/
          }}
        />}
        {selNum == 1 && <MenuItem
          text='rename'
          onClick={() => {
            prompt({ title: `Rename file "${sel.name}"`, value: sel.name })
            .then(newName => {
              m.update({ fileId: sel.fileId, newName });
            });
          }}
        />}
        <MenuItem
          text={`delete ${selNum} files`}
          onClick={() => {
            m.deleteSelected();
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

  renderContentPanel() {
    const m = this.props.model;
    if (!m.getContentPanelShow())
      return null;

    const sel = m.getLastSelectFile();
    let jsx: JSX.Element = null;
    let url = sel ? m.getPath(sel.fileId) : '';
    if (sel && ['.jpg', '.jpeg', '.png', '.gif'].indexOf(sel.type) != -1) {
      jsx = (
        <div
          key={url}
          style={{
            backgroundImage: `url(${url})`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            right: 0
          }}
        />
      );
    } else if (sel && ['.mp4'].indexOf(sel.type) != -1) {
      jsx = (
        <video
          width='100%'
          height='100%'
          src={url}
          controls
        />
      );
    } else if (sel) {
      jsx = <span>{sel.name}</span>;
    }

    return (
      <div style={{ flexGrow: 0, width: this.state.rightPanelSize, backgroundColor: 'white', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {jsx}
        </div>
        <VerticalResizer
          side='left'
          style={{ marginLeft: -5 }}
          size={this.state.rightPanelSize}
          scale={-1}
          onResizing={size => {
            this.setState({ rightPanelSize: size });
          }}
        />
      </div>
    );
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
          <div style={{ display: 'flex', flexGrow: 1, flexDirection: 'column' }}>
            {this.renderFolderView()}
            <div style={{ display: 'flex', flexGrow: 1, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, display: 'flex' }}>
                {jsx}
              </div>
            </div>
          </div>
          {this.renderContentPanel()}
          {this.renderDNDOverlay()}
        </div>
      </Droppable>
    );
  }
}
