import * as React from 'react';
import { FitToParent } from 'ts-react-ui/fittoparent';
import { VideoFileObject } from '../client/video-file-object';
import { RangeSlider } from 'ts-react-ui/range-slider';
import { getSeconds } from '../common/time';
import { Rect, Point, Size } from '../common/point';
import { startDragging } from 'ts-react-ui/common/start-dragging';

export { VideoFileObject };


interface DragArgs {
  pt: Point;
  s: number;
  rect: Rect;
  handle(newPt: Point);
}

function dragPoint(args: DragArgs) {
  return (e: React.MouseEvent<HTMLDivElement>) => {
    return startDragging({x: 0, y: 0}, {
      onDragging: evt => {
        const pt = {
          x: args.pt.x + evt.x / args.s,
          y: args.pt.y + evt.y / args.s
        };
        pt.x = Math.min(Math.max(args.rect.x, pt.x), args.rect.x + args.rect.width);
        pt.y = Math.min(Math.max(args.rect.y, pt.y), args.rect.y + args.rect.height);
        args.handle(pt);
      }
    })(e.nativeEvent);
  };
}

class CropRect extends React.Component<{rect: Partial<Rect>, el: HTMLVideoElement, width: number, height: number}> {
  render() {
    const base: React.CSSProperties = {
      cursor: 'pointer',
      backgroundColor: 'gray',
      position: 'absolute',
      width: 5,
      height: 5
    };

    const rect = this.props.rect;
    let videoSize: Size = { width: 0, height: 0};

    let w = 0;
    let h = 0;
    const el = this.props.el;
    let s = 1;
    if (el) {
      s = Math.min( this.props.width / el.videoWidth, this.props.height / el.videoHeight );
      w = el.videoWidth * s;
      h = el.videoHeight * s;
      videoSize.width = el.videoWidth;
      videoSize.height = el.videoHeight;
    }

    let ofx = (this.props.width - w) / 2;
    let ofy = (this.props.height - h) / 2;
    return (
      <>
        <div style={{
            position: 'absolute',
            left: ofx + rect.x * s,
            top: ofy + rect.y * s,
            width: rect.width * s,
            height: rect.height * s,
            border: '1px solid black'
          }}
        />
        <div
          style={{left: ofx + rect.x * s, top: ofy + rect.y * s, ...base}}
          onMouseDown={dragPoint({
            pt: { x: rect.x, y: rect.y },
            s,
            rect: {
              x: 0,
              y: 0,
              width: videoSize.width - rect.width,
              height: videoSize.height - rect.height
            },
            handle: pt => {
              rect.x = pt.x;
              rect.y = pt.y;
              this.setState({});
            }}
          )}
        />
        <div style={{
            left: ofx + (rect.x + rect.width) * s - 5,
            top: ofy + (rect.y + rect.height) * s - 5, ...base
          }}
          onMouseDown={dragPoint({
            pt: { x: rect.x + rect.width, y: rect.y + rect.height },
            s,
            rect: {
              x: rect.x,
              y: rect.y,
              width: videoSize.width - rect.width,
              height: videoSize.height - rect.height
            },
            handle: pt => {
              rect.width = pt.x - rect.x;
              rect.height = pt.y - rect.y;
              this.setState({});
            }}
          )}
        />
      </>
    );
  }
}

interface VideoProps extends React.HTMLProps<HTMLVideoElement> {
  el: React.RefObject<HTMLVideoElement>;
  crop: Partial<Rect>;
}

const Video: React.SFC<VideoProps> = props => {
  return (
    <>
      <video
        ref={props.el}
        {...props}
      />
      <CropRect
        width={+props.width}
        height={+props.height}
        rect={props.crop}
        el={props.el.current}
      />
    </>
  );
};

export interface Props {
  onlyContent?: boolean;
  model: VideoFileObject;
}

export interface State {
  cutRange: Array<number>;
  durRange: Array<number>;
  crop: Partial<Rect>;
}

export class VideoFileView extends React.Component<Props, Partial<State>> {
  video = React.createRef<HTMLVideoElement>();
  state: Partial<State> = { cutRange: [], crop: { x: 55, y: 119, width: 1182, height: 473 } };

  subscriber = () => {
    this.setState({});
  }

  onCutSelect = () => {
    const select = this.props.model.getSelectCut();
    if (!select)
      return;

    let state: Partial<State> = {};
    if (select.execArgs && select.execArgs.timeCut) {
      state.cutRange = [
        select.execArgs.timeCut.startSec,
        select.execArgs.timeCut.endSec
      ];
      this.video.current.currentTime = state.cutRange[0];
    }
    this.setState(state);
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
          <Video
            el={this.video}
            controls
            src={`${file}?${this.props.model.holder.getVersion()}`}
            crop={this.state.crop}
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
              this.props.model.execute({
                timeCut: { startSec, endSec },
                frameCut: { ...this.state.crop } as Rect
              });
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
