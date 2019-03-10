import * as React from 'react';
import { VideoConcatBase, OBJIDArgs, VideoFileBase } from '../base/video-concat';
import { PropsGroup } from 'ts-react-ui/prop-sheet';
import { ListView, Item } from 'ts-react-ui/list-view';
import { DropArgs } from 'ts-react-ui/drag-and-drop';
import { CheckIcon } from 'ts-react-ui/checkicon';

export class VideoConcat extends VideoConcatBase {
  onFileUploaded(): Promise<void> {
    return Promise.reject('not implemented');
  }

  sendFile(): Promise<any> {
    return Promise.reject('not implemented');
  }

  append(args: OBJIDArgs) {
    return this.holder.invokeMethod({ method: 'append', args });
  };

  remove(args: OBJIDArgs) {
    return this.holder.invokeMethod({ method: 'remove', args });
  }

  execute(): Promise<void> {
    return this.holder.invokeMethod({ method: 'execute', args: {} });
  }

  makeListItem = (video: VideoFileBase): Item => {
    return {
      value: video.holder.getID(),
      render: () => {
        return (
          <div className='horiz-panel-1 flexrow'>
            <div style={{flexGrow: 1, minWidth: 0, textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {video.getName()}
            </div>
            <CheckIcon
              value
              showOnHover
              faIcon='fa fa-trash'
              onClick={() => {
                this.remove({ id: video.holder.getID() });
              }}
            />
          </div>
        );
      }
    };
  }

  onDrop = (args: DropArgs) => {
    this.append({ id: args.dragData['id'] });
  };

  renderList() {
    return (
      <PropsGroup label='list' itemWrap={false} defaultHeight={200}>
        <ListView
          values={this.getList().map(this.makeListItem)}
        />
      </PropsGroup>
    );
  }

  getObjPropGroups() {
    return (
      <>
        {this.renderList()}
      </>
    );
  }
}
