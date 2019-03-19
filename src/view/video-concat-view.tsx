import * as React from 'react';
import { VideoConcat } from '../client/video-concat';
import { Droppable, DropArgs } from 'ts-react-ui/drag-and-drop';
import { FitToParent } from 'ts-react-ui/fittoparent';

export { VideoConcat };

export interface Props {
  model: VideoConcat;
}

export class VideoConcatView extends React.Component<Props> {
  onDrop = (args: DropArgs) => {
    this.props.model.append({ id: args.dragData['id'] });
  };

  render() {
    return (
      <Droppable onDrop={this.onDrop}>
        <div style={{display: 'flex', flexGrow: 1, flexDirection: 'column'}}>
          <div style={{ position: 'relative', flexGrow: 1, display: 'flex'}}>
            <FitToParent wrapToFlex>
              {this.props.model.isStatusValid() && (
                <video
                  controls
                  loop
                  src={this.props.model.getPath() + '?' + this.props.model.holder.getVersion()}
                  style={{position: 'absolute'}}
                />
              )}
            </FitToParent>
          </div>
          <button style={{flexGrow: 0}} onClick={() => this.props.model.execute()}>execute</button>
        </div>
      </Droppable>
    );
  }
}

