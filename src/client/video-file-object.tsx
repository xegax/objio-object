import * as React from 'react';
import { VideoFileBase, RemoveArgs, FilterArgs, AppendImageArgs, SaveArgs } from '../base/video-file';
import { PropsGroup, PropItem, TextPropItem } from 'ts-react-ui/prop-sheet';
import { ListView, Item } from 'ts-react-ui/list-view';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { confirm, Action, OK, Cancel } from 'ts-react-ui/prompt';
import { MediaStream } from '../task/media-desc';
import { ObjectsFolder, ObjTab } from '../base/object-base';
import { ImageFileBase } from '../base/image-file';
import { PropGroup2 } from 'ts-react-ui/prop-sheet/props-group2';
import { cn } from 'ts-react-ui/common/common';
import { CSSIcon } from 'ts-react-ui/cssicon';
import { getTimeIntervalString } from '../common/time';
import { fmtBytes } from '../common/common';
import { showVideo } from 'ts-react-ui/video';

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

  appendImage(args: AppendImageArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'appendImage', args });
  }

  append(args: FilterArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'append', args });
  }

  save(args: SaveArgs) {
    return this.holder.invokeMethod({ method: 'save', args });
  }

  execute(args: RemoveArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'execute', args });
  }

  export() {
    return this.holder.invokeMethod({ method: 'export', args: {}});
  }

  import(file: File) {
    // return this.sendFile({ file, fileId: '.import' });
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
    this.holder.delayedNotify();
  }

  getSelectFile(): VideoFileBase | ImageFileBase | null {
    return this.selectFileId ? this.findFile(this.selectFileId) : null;
  }

  private renderStreamDesc(s: MediaStream) {
    if (s.video) {
      return (
        <>
          <PropItem
            label='Codec'
            value={s.video.codec}
            show={s.video.codec != null}
          />
          <PropItem
            label='Size'
            value={[s.video.width, s.video.height].join('x')}
            show={s.video.width != null && s.video.height != null}
          />
          <PropItem
            label='Bitrate'
            value={`${s.video.bitrate} Kb/s`}
            show={s.video.bitrate != null}
          />
          <PropItem
            label='FPS'
            value={s.video.fps}
            show={s.video.fps != null}
          />
          <PropItem
            label='Pixel fmt.'
            value={s.video.pixelFmt}
            show={s.video.pixelFmt != null}
          />
        </>
      );
    } else if (s.audio) {
      return (
        <>
          <PropItem
            label='Codec'
            value={s.audio.codec}
            show={s.audio.codec != null}
          />
          <PropItem
            label='Freq.'
            value={s.audio.freq}
            show={s.audio.freq != null}
          />
          <PropItem
            label='Bitrate'
            value={s.audio.bitrate}
            show={s.audio.bitrate != null}
          />
          <PropItem
            label='Channels'
            value={s.audio.channels}
            show={s.audio.channels != null}
          />
        </>
      );
    }
  }

  private renderImage = (item: ImageItem) => {
    const fileID = item.value;
    const file = item.file;
    return (
      <div className='video-preview'>
        <div
          className='video-preview-image'
          style={{ backgroundImage: `url(${file.getPath('preview-128')})` }}
        />
        <div className={cn('horz-panel-1', 'video-preview-footer')}>
          <div
            style={{ flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
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
                (file.isStatusInProgess() ? Math.floor(file.getProgress() * 100) + '% ' : '') + file.getName()
            }
          </div>
          <CheckIcon
            title='Remove'
            faIcon='fa fa-trash'
            value={false}
            onChange={() => {
              confirm({ body: 'Are you sure to delete?', actions: [ actRemoveAll, actRemoveObjectOnly, actCancel] })
              .then(action => {
                if (action == actCancel)
                  return;

                this.remove({ objId: fileID, removeContent: action == actRemoveAll });
              });
            }}
          />
        </div>
      </div>
    );
  }

  private renderCut = (item: CutItem) => {
    const fileID = item.value;
    const file = item.file;
    return (
      <div className='video-preview'>
        <div
          className='video-preview-image'
          style={{ backgroundImage: `url(${file.getPath('preview-128')})` }}
        >
          <CSSIcon
            title='Play'
            style={{ fontSize: '200%' }}
            hidden={file.getSize() == 0 || file.isStatusInProgess()}
            showOnHover
            icon='fa fa-play-circle'
            onClick={() => {
              this.setSelectFile(fileID);
              if (file.getSize() == 0)
                return;

              return showVideo({ src: file.getPath('content') });
            }}
          />
        </div>
        <div className={cn('horz-panel-1', 'video-preview-footer')}>
          <CheckIcon
            title='Execute'
            faIcon={file.isStatusInProgess() ? 'fa fa-spinner fa-spin' : 'fa fa-rocket'}
            value={file.getStatus() == 'ok'}
            onChange={() => {
              if (file.isStatusInProgess())
                return;

              let p: Promise<boolean>;
              if (file.getSize() != 0) {
                p = confirm({ body: 'Are you sure to execute encoding', actions: [ OK, Cancel ] })
                .then(act => act == OK)
                .catch(() => false);
              } else {
                p = Promise.resolve(true);
              }

              p.then(run => {
                if (run)
                  this.execute({ objId: fileID });
              });
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
                (file.isStatusInProgess() ? Math.floor(file.getProgress() * 100) + '% ' : '') + file.getName()
            }
          </div>
          <CheckIcon
            title='Remove'
            faIcon='fa fa-trash'
            value={false}
            onChange={() => {
              confirm({ body: 'Are you sure to delete?', actions: [ actRemoveAll, actRemoveObjectOnly, actCancel] })
              .then(action => {
                if (action == actCancel)
                  return;

                this.remove({ objId: fileID, removeContent: action == actRemoveAll });
              });
            }}
          />
        </div>
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

  private renderCuts = () => {
    const selectFile = this.getSelectFile();
    const files = this.getFiles();
    return (
      <>
        <PropsGroup
          label='Cuts'
          itemWrap={false}
          grow
        >
          <ListView
            className='abs-fit'
            value={selectFile ? { value: selectFile.holder.getID() } : null}
            values={files.map(this.makeCutItem)}
            onSelect={(item: CutItem) => {
              this.setSelectFile(item.value);
            }}
          />
        </PropsGroup>
        <PropsGroup
          label='Selected'
          open={selectFile == null ? false : undefined}
        >
          {this.renderSelectCut(selectFile as VideoFileBase)}
        </PropsGroup>
      </>
    );
  }

  private renderSelectCut(file: VideoFileBase) {
    if (!file)
      return null;

    let et = file.getEncodeTime();
    if (et == 0)
      et = Date.now() - file.getEncodeStartTime();

    return (
      <>
        <PropItem
          label='Name'
          value={file.getName()}
        />
        <PropItem
          label='Size'
          value={fmtBytes(file.getSize())}
        />
        <PropItem
          show={file.getEncodeTime() > 0}
          label='Encode time'
          value={getTimeIntervalString(et)}
        />
      </>
    );
  }

  private renderImages = () => {
    const selectFile = this.getSelectFile();
    const images = this.getImages();
    return (
      <PropsGroup
        label='Images'
        itemWrap={false}
        grow
      >
        <ListView
          className='abs-fit'
          value={selectFile ? { value: selectFile.holder.getID() } : null}
          values={images.map(this.makeImageItem)}
        />
      </PropsGroup>
    );
  }

  private renderStream() {
    const streamArr = (this.desc.streamArr || []).filter((s, i) => s.video || s.audio);
    if (streamArr.length == 0)
      return null;

    return (
      <PropsGroup
        label='Stream'
      >
        {streamArr.map((s, i) => {
          return (
            <PropGroup2
              key={i}
              label={`${s.video && 'Video' || s.audio && 'Audio'} ${s.id}`}
            >
              {this.renderStreamDesc(s)}
            </PropGroup2>
          );
        })}
      </PropsGroup>
    );
  }

  getObjPropGroups() {
    return (
      <>
        {this.renderStream()}
      </>
    );
  }

  getObjTabs(): Array<ObjTab> {
    return [
      {
        icon: 'fa fa-cut',
        title: 'Cuts',
        render: this.renderCuts
      }, {
        icon: 'fa fa-image',
        title: 'Images',
        render: this.renderImages
      }
    ];
  }
}
