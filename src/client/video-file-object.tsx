import * as React from 'react';
import { VideoFileBase, SendFileArgs, FileId, FilterArgs } from '../base/video-file';
import { PropsGroup, PropItem, TextPropItem } from 'ts-react-ui/prop-sheet';
import { ListView } from 'ts-react-ui/list-view';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { MediaStream } from '../task/media-desc';
import { ObjectsFolder, ObjectBase } from '../base/object-base';

export class VideoFileObject extends VideoFileBase {
  protected selectFileId: string;
  protected editNameCutId: string;
  protected playResultId: string;

  append(args: FilterArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'append', args });
  }

  save(args: FilterArgs) {
    return this.holder.invokeMethod({ method: 'save', args });
  }

  execute(args: FileId): Promise<void> {
    return this.holder.invokeMethod({ method: 'execute', args });
  }

  remove(args: FileId): Promise<void> {
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

  sendFile(args: SendFileArgs): Promise<any> {
    return this.holder.invokeMethod({
      method: 'sendFile',
      args: args.file,
      onProgress: args.onProgress
    });
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

  getSelectFile(): VideoFileBase | null {
    return this.selectFileId ? this.findFile(this.selectFileId) : null;
  }

  setPlayResultFile(id: string) {
    if (this.playResultId == id)
      return;

    this.playResultId = id;
    this.holder.delayedNotify();
  }

  getPlayResultFile(): VideoFileBase {
    return this.playResultId ? this.findFile(this.playResultId) : null;
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

  renderCut(file: VideoFileBase) {
    const fileID = file.holder.getID();
    return {
      value: fileID,
      title: file.getName(),
      render: () => (
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

              this.execute({ id: fileID });
            }}
          />
          <div
            style={{ flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
            onClick={() => {
              this.setSelectFile(fileID);
            }}
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
            onChange={() => this.remove({ id: fileID })}
          />
        </div>
      )
    };
  }

  renderCuts() {
    const selectFile = this.getSelectFile();
    const files = this.getFiles();
    return (
      <PropsGroup label='cuts' itemWrap={false} defaultHeight={200}>
        <ListView
          value={selectFile ? { value: selectFile.holder.getID() } : null}
          values={files.map(file => this.renderCut(file))}
        />
      </PropsGroup>
    );
  }

  getObjPropGroups() {
    return (
      <>
        <PropsGroup defaultOpen={false} label='description'>
          {(this.desc.streamArr || []).map(s => {
            return (
              <PropsGroup defaultOpen={false} label={(s.video && 'video' || s.audio && 'audio') + ' ' + s.id}>
                {this.renderStreamDesc(s)}
              </PropsGroup>
            );
          })}
        </PropsGroup>
        {this.renderCuts()}
      </>
    );
  }
}
