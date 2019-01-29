import * as React from 'react';
import { FitToParent } from 'ts-react-ui/fittoparent';
import { VideoFileObject } from '../client/video-file-object';
import { RangeSlider } from 'ts-react-ui/range-slider';
import { Rect, Point, Size } from '../common/point';
import { startDragging } from 'ts-react-ui/common/start-dragging';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { FilterArgs, TimeCutRange } from '../base/video-file';
export { VideoFileObject };

interface VideoCtrlProps {
  src: string;
  filter: FilterArgs;

  save?(): void;
  append(): void;
  onTime(t: number): void;
  onCutChange(range: TimeCutRange): void;
  onCropChange(crop: Rect): void;
}

interface VideoCtrlState {
  duration: number;
  zoom?: TimeCutRange;
  play?: 'cut' | 'file';
  loop?: boolean;
}

class VideoCtrl extends React.Component<VideoCtrlProps, VideoCtrlState> {
  private video = React.createRef<HTMLVideoElement>();
  state: VideoCtrlState = { duration: 0, loop: true };

  componentDidMount() {
    const v = this.video.current;
    v.addEventListener('loadedmetadata', () => {
      this.setState({
        duration: this.video.current.duration
      });
    });

    v.addEventListener('timeupdate', () => {
      this.props.onTime(v.currentTime);

      if (this.state.play)
        this.onTimeUpdate();
    });

    v.addEventListener('ended', () => {
      if (this.state.play)
        this.onTimeUpdate();
    });
  }

  onTimeUpdate() {
    const v = this.video.current;
    let startTime = 0, endTime = v.duration;
    if (this.state.play == 'cut') {
      const r = this.getRange();
      startTime = r[0];
      endTime = r[1];
    }

    if (v.currentTime >= endTime) {
      if (!this.state.loop) {
        v.currentTime = endTime;
        v.pause();
        this.setState({ play: null });
      } else {
        v.currentTime = startTime;
        v.paused && v.play();
        this.setState({});
      }
    }
  }

  getStartTime() {
    if (!this.props.filter.cut)
      return 0;
    return this.props.filter.cut.startSec;
  }

  getEndTime() {
    if (!this.props.filter.cut)
      return this.video.current.duration;
    return this.props.filter.cut.endSec;
  }

  setTime(t: number) {
    this.video.current.currentTime = t;
    this.setState({});
  }

  renderTools() {
    return (
      <div className='horz-panel-1'>
        <CheckIcon
          faIcon='fa fa-cut'
          value
          onChange={() => {
            /*const startSec = this.state.cutRange[0];
            const endSec = this.state.cutRange[1];
            this.props.model.execute({
              timeCut: { startSec, endSec },
              frameCut: { ...this.state.crop } as Rect
            });*/
          }}
        />
        <CheckIcon
          faIcon='fa fa-cut'
          style={{ color: 'blue' }}
          value={this.state.zoom != null}
          onChange={() => {
            if (!this.props.filter.cut)
              return;

            if (this.state.zoom) {
              this.setState({ zoom: null });
            } else {
              this.setState({ zoom: { ...this.props.filter.cut } });
            }
          }}
        />
        <CheckIcon
          faIcon='fa fa-crop'
          value={this.props.filter.crop != null}
          onChange={() => {
            /*if (this.state.crop) {
              this.setState({ crop: null });
            } else {
              this.setState({
                crop: {
                  x: 0, y: 0,
                  width: this.video.current.videoWidth,
                  height: this.video.current.videoHeight
                }
              });
            }*/
          }}
        />
        <CheckIcon
          faIcon='fa fa-plus'
          value
          onChange={() => {
            this.props.append();
          }}
        />
         <CheckIcon
          faIcon='fa fa-save'
          value={this.props.save != null}
          onChange={() => {
            this.props.save && this.props.save();
          }}
        />
      </div>
    );
  }

  onCutChanging = (min: number, max: number, el) => {
    this.props.onCutChange({ startSec: min, endSec: max });
    if (el == 'left' || el == 'thumb')
      this.video.current.currentTime = min;
    else if (el == 'right')
      this.video.current.currentTime = max;
  };

  onPlay = () => {
    const v = this.video.current;
    if (this.state.play == 'file') {
      v.pause();
      this.setState({ play: null });
    } else {
      if (v.currentTime >= v.duration)
        v.currentTime = 0;
      v.play();
      this.setState({ play: 'file' });
    }
  };

  onPlayCut = () => {
    const v = this.video.current;
    if (this.state.play == 'cut') {
      v.pause();
      this.setState({ play: null });
    } else {
      v.currentTime = this.getRange()[0];
      v.play();
      this.setState({ play: 'cut' });
    }
  };

  getRangeMin() {
    if (this.state.zoom)
      return this.state.zoom.startSec;

    return 0;
  }

  getRangeMax() {
    if (this.state.zoom)
      return this.state.zoom.endSec;

    return this.state.duration;
  }

  getRange() {
    if (!this.props.filter.cut)
      return [0, this.state.duration];

    return [
      this.props.filter.cut.startSec,
      this.props.filter.cut.endSec
    ];
  }

  renderCtrl() {
    const video = this.video.current;
    if (!video)
      return null;

    return (
      <div className='horz-panel-1' style={{ display: 'flex' }}>
        <CheckIcon
          style={{ flexGrow: 0, width: '1em' }}
          value
          faIcon={this.state.play != 'file' ? 'fa fa-play' : 'fa fa-pause'}
          onChange={this.onPlay}
        />
        <CheckIcon
          style={{ flexGrow: 0, width: '1em', color: 'blue' }}
          title='play cut'
          value
          faIcon={this.state.play != 'cut' ? 'fa fa-play' : 'fa fa-pause'}
          onChange={this.onPlayCut}
        />
        <div style={{ flexGrow: 1 }}>
          <RangeSlider
            dragThumb={false}
            onSeek={time => {
              video.currentTime = time;
              this.props.onTime(time);
            }}
            value={video.currentTime}
            min={this.getRangeMin()}
            max={this.getRangeMax()}
            range={this.getRange()}
            onChanging={this.onCutChanging}
          />
        </div>
      </div>
    );
  }

  renderVideo = (width: number, height: number) => {
    return (
      <video
        muted={true}
        ref={this.video}
        width={width}
        height={height}
        src={this.props.src}
      />
    );
  }

  render() {
    return (
      <div style={{ display: 'flex', flexGrow: 1, flexDirection: 'column' }}>
        <FitToParent
          wrapToFlex
          render={this.renderVideo}
        />
        {this.renderTools()}
        {this.renderCtrl()}
      </div>
    );
  }
}

interface DragArgs<T> {
  pt: Point;
  s: number;
  range: Rect;
  other?: T;
  handle(newPt: Point, args: DragArgs<T>): void;
}

function dragPoint<T>(args: DragArgs<T>) {
  return (e: React.MouseEvent<HTMLDivElement>) => {
    return startDragging({ x: 0, y: 0 }, {
      onDragging: evt => {
        const pt = {
          x: args.pt.x + evt.x / args.s,
          y: args.pt.y + evt.y / args.s
        };
        pt.x = Math.min(Math.max(args.range.x, pt.x), args.range.x + args.range.width);
        pt.y = Math.min(Math.max(args.range.y, pt.y), args.range.y + args.range.height);
        args.handle(pt, args);
      }
    })(e.nativeEvent);
  };
}

class CropRect extends React.Component<{ rect: Partial<Rect>, el: HTMLVideoElement, width: number, height: number }> {
  render() {
    if (!this.props.el)
      return null;

    const base: React.CSSProperties = {
      cursor: 'pointer',
      backgroundColor: 'gray',
      position: 'absolute',
      width: 5,
      height: 5
    };

    const rect = this.props.rect;
    let videoSize: Size = { width: 0, height: 0 };

    let w = 0;
    let h = 0;
    const el = this.props.el;
    let s = 1;
    if (el) {
      s = Math.min(this.props.width / el.videoWidth, this.props.height / el.videoHeight);
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
          border: '1px solid black',
          opacity: 0.5,
          backgroundColor: 'white'
        }}
          onMouseDown={dragPoint({
            pt: { x: rect.x, y: rect.y },
            s,
            range: { x: 0, y: 0, width: el.videoWidth - rect.width, height: el.videoHeight - rect.height },
            handle: newp => {
              rect.x = newp.x;
              rect.y = newp.y;
              this.setState({});
            }
          })}
        />
        <div
          style={{ left: ofx + rect.x * s, top: ofy + rect.y * s, ...base }}
          onMouseDown={dragPoint({
            pt: { x: rect.x, y: rect.y },
            s,
            range: { x: 0, y: 0, width: el.videoWidth, height: el.videoHeight },
            other: { right: rect.x + rect.width, bottom: rect.y + rect.height },
            handle: (newp, args) => {
              rect.x = newp.x;
              rect.y = newp.y;
              rect.width = args.other.right - newp.x;
              rect.height = args.other.bottom - newp.y;
              this.setState({});
            }
          }
          )}
        />
        <div style={{
          left: ofx + (rect.x + rect.width) * s - 5,
          top: ofy + (rect.y + rect.height) * s - 5, ...base
        }}
          onMouseDown={dragPoint({
            pt: { x: rect.x + rect.width, y: rect.y + rect.height },
            s,
            range: { x: 0, y: 0, width: el.videoWidth, height: el.videoHeight },
            handle: newp => {
              rect.width = newp.x - rect.x;
              rect.height = newp.y - rect.y;
              this.setState({});
            }
          })}
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
  let crop: JSX.Element;
  if (props.crop) {
    crop = (
      <CropRect
        width={+props.width}
        height={+props.height}
        rect={props.crop}
        el={props.el.current}
      />
    );
  }

  return (
    <>
      <video
        ref={props.el}
        {...props}
      />
      {crop}
    </>
  );
};

export interface Props {
  onlyContent?: boolean;
  model: VideoFileObject;
}

export interface State {
  durRange: Array<number>;
}

export class VideoFileView extends React.Component<Props, Partial<State>> {
  state: Partial<State> = {};
  ref = React.createRef<VideoCtrl>();

  subscriber = () => {
    this.setState({});
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.subscriber);
    this.props.model.holder.subscribe(this.onTime, 'time');
    this.props.model.holder.subscribe(this.onCutStart, 'cut-start');
    this.props.model.holder.subscribe(this.onCutEnd, 'cut-end');
    this.props.model.holder.subscribe(this.onCutEnd, 'cut-duration');
    this.props.model.holder.subscribe(this.onCutSelect, 'cut-select');
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.subscriber);
    this.props.model.holder.unsubscribe(this.onTime, 'time');
    this.props.model.holder.unsubscribe(this.onCutStart, 'cut-start');
    this.props.model.holder.unsubscribe(this.onCutEnd, 'cut-end');
    this.props.model.holder.unsubscribe(this.onCutEnd, 'cut-duration');
    this.props.model.holder.unsubscribe(this.onCutSelect, 'cut-select');
  }

  onCutSelect = () => {
    const filter = this.props.model.getFilter();
    this.ref.current.setTime(filter.cut ? filter.cut.startSec : 0);
  };

  onTime = () => {
    this.ref.current.setTime(this.props.model.getCurrTime());
  };

  onCutStart = () => {
    this.ref.current.setTime(this.props.model.getFilter().cut.startSec);
  };

  onCutEnd = () => {
    this.ref.current.setTime(this.props.model.getFilter().cut.endSec);
  };

  renderVideo(): JSX.Element {
    let file = this.getPath();
    let playCut = this.props.model.getPlayCut();
    if (playCut)
      file = this.props.model.getSubfilePath(playCut);

    return (
      <VideoCtrl
        ref={this.ref}
        key={file}
        filter={this.props.model.getFilter()}
        onCutChange={range => {
          this.props.model.setCut(range);
        }}
        onCropChange={crop => {
          this.props.model.setCrop(crop);
        }}
        onTime={t => {
          this.props.model.setCurrTime(t);
        }}
        append={() => {
          this.props.model.append({ filter: this.props.model.getFilter() });
        }}
        save={!this.props.model.getSelectCutId() ? null : () => {
          this.props.model.save({
            id: this.props.model.getSelectCutId(),
            filter: this.props.model.getFilter()
          });
        }}
        src={`${file}?${this.props.model.holder.getVersion()}`}
      />
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

  render() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <div style={{ flexGrow: 1, display: 'flex', position: 'relative' }}>
          {this.renderContent()}
        </div>
      </div>
    );
  }
}
