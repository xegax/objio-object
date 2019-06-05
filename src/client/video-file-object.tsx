import * as React from 'react';
import { VideoFileBase, SendFileArgs, RemoveArgs, FilterArgs, AppendImageArgs } from '../base/video-file';
import { PropsGroup, PropItem, TextPropItem } from 'ts-react-ui/prop-sheet';
import { ListView, Item } from 'ts-react-ui/list-view';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { confirm, Action } from 'ts-react-ui/prompt';
import { MediaStream } from '../task/media-desc';
import { ObjectsFolder } from '../base/object-base';
import { ImageFileBase } from '../base/image-file';

const actRemoveAll: Action = {
  text: 'Remove all',
  onAction: () => {}
};

const actRemoveObjectOnly: Action = {
  text: 'Object only',
  onAction: () => {}
};

const actCancel: Action = {
  text: 'Cancel',
  onAction: () => {}
};

interface CutItem extends Item {
  file: VideoFileBase;
}

interface ImageItem extends Item {
  file: ImageFileBase;
}

export class VideoFileObject extends VideoFileBase {
  protected selectFileId: string;
  protected editNameCutId: string;
  protected playResultId: string;

  appendImage(args: AppendImageArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'appendImage', args });
  }

  append(args: FilterArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'append', args });
  }

  save(args: FilterArgs) {
    return this.holder.invokeMethod({ method: 'save', args });
  }

  execute(args: RemoveArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'execute', args });
  }

  export() {
    return this.holder.invokeMethod({ method: 'export', args: {}});
  }

  import(file: File) {
    return this.sendFile({ file, fileId: '.import' });
  }

  remove(args: RemoveArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'remove', args });
  }

  updateDesciption(): Promise<void> {
    return this.holder.invokeMethod({ method: 'updateDescription', args: {} });
  }

  getChildren(): Array<ObjectsFolder> {
    const objects = this.files.getArray().filter(obj => obj.getSize());
    if (!objects.length)
      return [];

    return [ { objects } ];
  }

  onFileUploaded() {
    return Promise.resolve();
  }

  getFilter() {
    return this.filter;
  }

  setSelectFile(id: string) {
    if (id == this.selectFileId)
      return;

    if (this.editNameCutId != id)
      this.editNameCutId = null;

    this.selectFileId = id;
    this.playResultId = null;
    this.holder.delayedNotify();
  }

  getSelectFile(): VideoFileBase | ImageFileBase | null {
    return this.selectFileId ? this.findFile(this.selectFileId) : null;
  }

  setPlayResultFile(id: string) {
    if (this.playResultId == id)
      return;

    this.playResultId = id;
    this.holder.delayedNotify();
  }

  getPlayResultFile(): VideoFileBase {
    return this.playResultId ? (this.findFile(this.playResultId) as VideoFileBase) : null;
  }

  renderStreamDesc(s: MediaStream) {
    if (s.video) {
      return (
        <>
          <PropItem label='codec' value={s.video.codec} />
          <PropItem label='size' value={[s.video.width, s.video.height].join('x')} />
          <PropItem label='bitrate' value={s.video.bitrate + ' kb/s'} />
          <PropItem label='fps' value={s.video.fps} />
          <PropItem label='pixel format' value={s.video.pixelFmt} />
        </>
      );
    } else if (s.audio) {
      return (
        <>
          <PropItem label='codec' value={s.audio.codec} />
          <PropItem label='frequency' value={s.audio.freq} />
          <PropItem label='bitrate' value={s.audio.bitrate} />
          <PropItem label='channels' value={s.audio.channels} />
        </>
      );
    }
  }

  private renderImage = (item: ImageItem) => {
    const fileID = item.value;
    const file = item.file;
    return (
      <div className='horz-panel-1' style={{ display: 'flex' }}>
        <div
          style={{ flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
          /*onClick={() => {
            this.setSelectFile(fileID);
          }}*/
          onDoubleClick={() => {
            this.editNameCutId = fileID;
            this.holder.delayedNotify();
          }}
        >
          {
            this.editNameCutId == fileID ?
              <TextPropItem
                value={file.getName()}
                onEnter={name => {
                  file.setName(name);
                  this.editNameCutId = null;
                  this.holder.delayedNotify();
                }}
              /> :
              (file.isStatusInProgess() ? file.getProgress() * 100 + '% ' : '') + file.getName()
          }
        </div>
        <CheckIcon
          title='Remove'
          faIcon='fa fa-trash'
          value={false}
          onChange={() => {
            confirm({ text: 'Are you sure to delete?', actions: [ actRemoveAll, actRemoveObjectOnly, actCancel] })
            .then(action => {
              if (action == actCancel)
                return;

              this.remove({ objId: fileID, removeContent: action == actRemoveAll });
            });
          }}
        />
      </div>
    );
  }

  private renderCut = (item: CutItem) => {
    const fileID = item.value;
    const file = item.file;
    return (
      <div className='horz-panel-1' style={{ display: 'flex' }}>
        <CheckIcon
          title='Result'
          faIcon={fileID != this.playResultId ? 'fa fa-play-circle' : 'fa fa-stop-circle'}
          value={file.getSize() != 0}
          onChange={() => {
            this.setSelectFile(fileID);
            if (file.getSize() == 0)
              return;

            if (fileID == this.playResultId)
              this.setPlayResultFile(null);
            else
              this.setPlayResultFile(fileID);
          }}
        />
        <CheckIcon
          title='Execute'
          faIcon={file.isStatusInProgess() ? 'fa fa-spinner fa-spin' : 'fa fa-rocket'}
          value={file.getStatus() == 'ok'}
          onChange={() => {
            if (file.isStatusInProgess())
              return;

            this.execute({ objId: fileID });
          }}
        />
        <div
          style={{ flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
          /*onClick={() => {
            this.setSelectFile(fileID);
          }}*/
          onDoubleClick={() => {
            this.editNameCutId = fileID;
            this.holder.delayedNotify();
          }}
        >
          {
            this.editNameCutId == fileID ?
              <TextPropItem
                value={file.getName()}
                onEnter={name => {
                  file.setName(name);
                  this.editNameCutId = null;
                  this.holder.delayedNotify();
                }}
              /> :
              (file.isStatusInProgess() ? file.getProgress() * 100 + '% ' : '') + file.getName()
          }
        </div>
        <CheckIcon
          title='Remove'
          faIcon='fa fa-trash'
          value={false}
          onChange={() => {
            confirm({ text: 'Are you sure to delete?', actions: [ actRemoveAll, actRemoveObjectOnly, actCancel] })
            .then(action => {
              if (action == actCancel)
                return;

              this.remove({ objId: fileID, removeContent: action == actRemoveAll });
            });
          }}
        />
      </div>
    );
  }

  private makeCutItem = (file: VideoFileBase): CutItem => {
    const fileID = file.holder.getID();
    return {
      file,
      value: fileID,
      title: file.getName(),
      render: this.renderCut
    };
  }

  private makeImageItem = (file: ImageFileBase): ImageItem => {
    const value = file.holder.getID();
    return {
      file,
      value,
      title: file.getName(),
      render: this.renderImage
    };
  }

  renderCuts() {
    const selectFile = this.getSelectFile();
    const files = this.getFiles();
    return (
      <PropsGroup label='cuts' itemWrap={false} defaultHeight={200}>
        <ListView
          value={selectFile ? { value: selectFile.holder.getID() } : null}
          values={files.map(this.makeCutItem)}
          onSelect={(item: CutItem) => {
            this.setSelectFile(item.value);
          }}
        />
      </PropsGroup>
    );
  }

  renderImages() {
    const selectFile = this.getSelectFile();
    const images = this.getImages();
    return (
      <PropsGroup label='images' itemWrap={false} defaultHeight={200}>
        <ListView
          value={selectFile ? { value: selectFile.holder.getID() } : null}
          values={images.map(this.makeImageItem)}
          onSelect={(item: ImageItem) => {
            this.setSelectFile(item.value);
          }}
        />
      </PropsGroup>
    );
  }

  getObjPropGroups() {
    return (
      <>
        <PropsGroup defaultOpen={false} label='description'>
          {(this.desc.streamArr || []).map((s, i) => {
            if (!s.video && !s.audio)
              return null;

            return (
              <PropsGroup key={i} defaultOpen={false} label={(s.video && 'video' || s.audio && 'audio') + ' ' + s.id}>
                {this.renderStreamDesc(s)}
              </PropsGroup>
            );
          }).filter(s => s)}
        </PropsGroup>
        {this.renderCuts()}
        {this.renderImages()}
      </>
    );
  }
}
