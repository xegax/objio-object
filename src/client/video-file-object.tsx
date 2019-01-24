import * as React from 'react';
import { VideoFileBase, ExecuteArgs, SendFileArgs, Subfile, SplitId } from '../base/video-file';
import { PropsGroup, PropItem } from 'ts-react-ui/prop-sheet';
import { ListView } from 'ts-react-ui/list-view';
import { getString } from '../common/time';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { MediaStream } from '../task/media-desc';

export class VideoFileObject extends VideoFileBase {
  protected selectCutId: string;
  protected playCutId: string;

  execute(args: ExecuteArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'split', args });
  }

  removeSplit(args: SplitId): Promise<void> {
    return this.holder.invokeMethod({ method: 'removeSplit', args});
  }

  updateDesciption(): Promise<void> {
    return this.holder.invokeMethod({ method: 'updateDescription', args: {} });
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

  setSelectCut(id: string) {
    if (id == this.selectCutId)
      return;

    this.selectCutId = id;
    this.playCutId = null;
    this.holder.delayedNotify();
  }

  setPlayCut(id: string) {
    if (id == this.playCutId)
      return;

    if (id)
      this.selectCutId = id;

    this.playCutId = id;
    this.holder.delayedNotify();
  }

  getPlayCut() {
    return this.findCutById(this.playCutId);
  }

  getSelectCut(): Subfile | null {
    return this.selectCutId ? this.findCutById(this.selectCutId) : null;
  }

  renderStreamDesc(s: MediaStream) {
    if (s.video) {
      return (
        <>
          <PropItem label='codec' value={s.video.codec}/>
          <PropItem label='size' value={[s.video.width, s.video.height].join('x')}/>
          <PropItem label='bitrate' value={s.video.bitrate + ' kb/s'}/>
          <PropItem label='fps' value={s.video.fps}/>
          <PropItem label='pixel format' value={s.video.pixelFmt}/>
        </>
      );
    } else if (s.audio) {
      return (
        <>
          <PropItem label='codec' value={s.audio.codec}/>
          <PropItem label='frequency' value={s.audio.freq}/>
          <PropItem label='bitrate' value={s.audio.bitrate}/>
          <PropItem label='channels' value={s.audio.channels}/>
        </>
      );
    }
  }

  getObjPropGroups() {
    const selectCut = this.getSelectCut();
    return (
      <>
        <PropsGroup defaultOpen={false} label='description'>
          <PropItem
            label='duration'
            value={getString(this.desc.duration)}
          />
          {(this.desc.streamArr || []).map(s => {
            return (
              <PropsGroup defaultOpen={false} label={(s.video && 'video' || s.audio && 'audio') + ' ' + s.id }>
                {this.renderStreamDesc(s)}
              </PropsGroup>
            );
          })}
        </PropsGroup>
        <PropsGroup label='cuts'>
          <ListView
            value={selectCut ? { value: selectCut.id } : null}
            values={this.subfiles.map(file => {
              return {
                value: file.id,
                render: () => (
                  <div className='horz-panel-1' style={{display: 'flex'}}>
                    <CheckIcon
                      faIcon='fa fa-play'
                      value={this.playCutId == file.id}
                      onChange={() => {
                        if (this.playCutId == file.id ) {
                          this.setPlayCut(null);
                        } else {
                          this.setPlayCut(file.id);
                          this.holder.delayedNotify({ type: 'cut-select' });
                        }
                      }}
                    />
                    <div
                      style={{flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis'}}
                      onClick={() => {
                        this.setSelectCut(file.id);
                        this.holder.delayedNotify({ type: 'cut-select' });
                      }}
                    >
                      {file.name}
                    </div>
                    <CheckIcon
                      faIcon='fa fa-trash'
                      value={false}
                      onChange={() => this.removeSplit({id: file.id})}
                    />
                  </div>
                )
              };
            })}
          />
        </PropsGroup>
      </>
    );
  }
}