import * as React from 'react';
import { FitToParent } from 'ts-react-ui/fittoparent';
import { VideoFileObject } from '../client/video-file-object';
import { RangeSlider } from 'ts-react-ui/range-slider';
import { getSeconds } from '../common/time';

export { VideoFileObject };

export interface Props {
  onlyContent?: boolean;
  model: VideoFileObject;
}

export interface State {
  cutRange?: Array<number>;
  durRange?: Array<number>;
}

export class VideoFileView extends React.Component<Props, State> {
  video = React.createRef<HTMLVideoElement>();
  state: State = { cutRange: [] };

  subscriber = () => {
    this.setState({});
  }

  onCutSelect = () => {
    const select = this.props.model.getSelectCut();
    if (!select)
      return;

    this.setState({ cutRange: [ select.split.startSec, select.split.endSec ] });
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.subscriber);
    this.props.model.holder.subscribe(this.onCutSelect, 'cut-select');
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.subscriber);
  }

  renderVideo(): JSX.Element {
    let file = this.getPath();
    let playCut = this.props.model.getPlayCut();
    if (playCut)
      file = this.props.model.getSubfilePath(playCut);

    return (
      <div style={{display: 'flex', flexGrow: 1, flexDirection: 'column'}}>
        <FitToParent wrapToFlex>
          <video
            ref={this.video}
            controls
            src={`${file}?${this.props.model.holder.getVersion()}`}
          />
        </FitToParent>
      </div>
    );
  }

  getPath(): string {
    return this.props.model.getPath();
  }

  renderContent(): JSX.Element | string {
    const state = this.props.model;
    if (!state.isStatusValid() || state.getProgress() < 1)
      return null;

    return this.renderVideo();
  }

  onCutRange = (min: number, max: number) => {
    this.setState({ cutRange: [min, max ]});
  }

  onCutRangeChanging = (min: number, max: number, el: 'left' | 'right' | 'thumb') => {
    if (el == 'left' || el == 'thumb')
      this.video.current.currentTime = min;
    else if (el == 'right')
      this.video.current.currentTime = max;
  }

  renderRangeSlider() {
    const model = this.props.model;
    const d = model.getDesc().duration;
    if (!d || model.getPlayCut())
      return null;

    const durInSec = getSeconds(d);
    const durRange = this.state.durRange;

    return (
      <div style={{flexGrow: 0}}>
        <div className='horz-panel-1'>
          <i
            className='fa fa-cut'
            onClick={() => {
              const startSec = this.state.cutRange[0];
              const endSec = this.state.cutRange[1];
              this.props.model.split({ startSec, endSec});
            }}
          />
          <i
            className='fa fa-cut'
            style={{color: 'blue'}}
            onClick={() => {
              const cutRange = this.state.cutRange;
              if (this.state.durRange)
                this.setState({ durRange: null, cutRange: [ durRange[0], durRange[1] ] });
              else
                this.setState({
                  durRange: [cutRange[0], cutRange[1]]
                });
            }}
          />
        </div>
        <div>
          <RangeSlider
            min={durRange ? durRange[0] : 0}
            max={durRange ? durRange[1] : durInSec}
            range={[...this.state.cutRange]}
            onChanged={this.onCutRange}
            onChanging={this.onCutRangeChanging}
          />
        </div>
      </div>
    );
  }

  render() {
    return (
      <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1}}>
        <div style={{flexGrow: 1, display: 'flex', position: 'relative'}}>
          {this.renderContent()}
        </div>
        {this.renderRangeSlider()}
      </div>
    );
  }
}
