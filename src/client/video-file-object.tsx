import * as React from 'react';
import { VideoFileBase, SplitArgs, SendFileArgs, Subfile, SplitId } from '../base/video-file';
import { PropsGroup, PropItem } from 'ts-react-ui/prop-sheet';
import { ListView } from 'ts-react-ui/list-view';
import { getString } from '../common/time';
import { CheckIcon } from 'ts-react-ui/checkicon';

export class VideoFileObject extends VideoFileBase {
  protected selectCutId: string;
  protected playCutId: string;

  split(args: SplitArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'split', args });
  }

  removeSplit(args: SplitId): Promise<void> {
    return this.holder.invokeMethod({ method: 'removeSplit', args});
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

    this.playCutId = id;
    this.holder.delayedNotify();
  }

  getPlayCut() {
    return this.findCutById(this.playCutId);
  }

  getSelectCut(): Subfile | null {
    return this.selectCutId ? this.findCutById(this.selectCutId) : null;
  }

  getObjPropGroups() {
    const selectCut = this.getSelectCut();
    return (
      <>
        <PropsGroup label='description'>
          <PropItem label='duration' value={getString(this.desc.duration)}/>
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
                        if (this.playCutId == file.id )
                          this.setPlayCut(null);
                        else
                          this.setPlayCut(file.id);
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
