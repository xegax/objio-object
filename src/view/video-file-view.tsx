import * as React from 'react';
import { VideoFileObject } from '../client/video-file-object';
import { Video, VideoData } from 'ts-react-ui/video';
import { FilterArgs, VideoFileBase } from '../base/video-file';
import { Tag, EditValue } from 'ts-react-ui/timeline';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { Size } from '../common/point';
import { ImageFile } from '../client/image-file';

export { VideoFileObject };

export interface VideoDataExt extends VideoData {
  reverse?: boolean;
  resize?: Size;
  fps?: number;
  hflip?: boolean;
  vflip?: boolean;
  speed?: number;
  noaudio?: boolean;
}

export interface Props {
  onlyContent?: boolean;
  model: VideoFileObject;
}

export interface State {
  data?: VideoDataExt;
  fileId?: string;
}

export class VideoFileView extends React.Component<Props, State> {
  state: Partial<State> = {
    data: { src: this.props.model.getPath() }
  };

  ref = React.createRef<Video>();

  subscriber = () => {
    const state: State = {};

    const file = this.props.model.getSelectFile();
    if (file && file instanceof VideoFileBase) {
      const filter = file.getFilter();
      if (file.holder.getID() != this.state.fileId) {
        state.fileId = file.holder.getID();
        state.data = {
          src: this.getPath(),
          trim: filter.trim,
          reverse: filter.reverse,
          crop: filter.crop,
          resize: filter.resize,
          fps: filter.fps,
          hflip: filter.hflip,
          vflip: filter.vflip,
          speed: filter.speed,
          noaudio: filter.noaudio
        };
      }
    } else {
      if (this.state.fileId) {
        state.data = {
          src: this.getPath()
        };
      }

      state.fileId = null;
    }

    const res = this.props.model.getPlayResultFile();
    if (res) {
      state.fileId = null;
    }

    this.setState(state);
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.subscriber);
    this.subscriber();
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.subscriber);
    this.setState({ fileId: null });
  }

  getCurrentFilter(): FilterArgs {
    const video = this.ref.current;
    const data = this.state.data;

    const { src, ...other } = video.getData();
    const filter: FilterArgs = {
      ...other,
      reverse: data.reverse,
      resize: data.resize ? {...data.resize} : null,
      fps: data.fps,
      speed: data.speed,
      hflip: data.hflip,
      vflip: data.vflip,
      noaudio: data.noaudio
    };

    return filter;
  }

  renderTags() {
    const data = this.state.data;
    return [
      data.reverse && (
        <Tag
          color='#DEFFDD'
          onRemove={() => {
            data.reverse = false;
            this.setState({});
          }}
        >
          reverse
        </Tag>
      ),
      data.resize && (
        <Tag
          color='#FFFEDD'
          icon='fa fa-arrows-alt'
          onRemove={() => {
            data.resize = null;
            this.setState({});
          }}
        >
          <CheckIcon
            value
            faIcon='fa fa-refresh'
            onChange={() => {
              if (data.crop) {
                data.resize.width = data.crop.width;
                data.resize.height = data.crop.height;
              } else {
                data.resize = this.props.model.getFrameSize();
              }

              this.setState({});
            }}
          />
          <span> width: </span>
          <EditValue
            value={'' + data.resize.width}
            onChange={value => {
              const neww = Math.round(+value);
              if (neww == data.resize.width)
                return this.setState({});

              const frame = this.props.model.getFrameSize();
              let s = neww / frame.width;
              data.resize.width = neww;
              data.resize.height = Math.round(frame.height * s);
              if (data.resize.height & 1)
                data.resize.height++;

              this.setState({});
            }}
          />
          <span> height: </span>
          <EditValue
            value={'' + this.state.data.resize.height}
            onChange={value => {
              let newh = Math.round(+value);
              if (newh & 1)
                newh++;

              if (newh == this.state.data.resize.height)
                return this.setState({});

              const frame = this.props.model.getFrameSize();
              let s = newh / frame.height;
              data.resize.width = Math.round(frame.width * s);
              data.resize.height = newh;

              this.setState({});
            }}
          />
        </Tag>
      ),
      data.fps && (
        <Tag
          icon='fa fa-film'
          color='#DEFFDD'
          onRemove={() => {
            data.fps = null;
            this.setState({});
          }}
        >
          <EditValue
            value={'' + data.fps}
            onChange={value => {
              const fps = +value;
              if (!Number.isNaN(fps))
                data.fps = fps;
              this.setState({});
            }}
          />
        </Tag>
      ),
      data.speed && (
        <Tag
          icon='fa fa-clock-o'
          color='#DEFFDD'
          onRemove={() => {
            data.speed = null;
            this.setState({});
          }}
        >
          <EditValue
            value={'' + data.speed}
            onChange={value => {
              const speed = +value;
              if (!Number.isNaN(speed))
                data.speed = speed;
              this.setState({});
            }}
          />
        </Tag>
      ),
      data.vflip && (
        <Tag
          icon='fa fa-arrows-v'
          color='#DEFFDD'
          onRemove={() => {
            data.vflip = null;
            this.setState({});
          }}
        />
      ),
      data.hflip && (
        <Tag
          icon='fa fa-arrows-h'
          color='#DEFFDD'
          onRemove={() => {
            data.hflip = null;
            this.setState({});
          }}
        />
      ),
      data.noaudio && (
        <Tag
          icon='fa fa-volume-off'
          color='#e9ffdd'
          onRemove={() => {
            data.noaudio = null;
            this.setState({});
          }}
        >
          No audio
        </Tag>
      )
    ] as Array<React.ReactElement<Tag>>;
  }

  renderToolbar() {
    const cut = this.props.model.getSelectFile();
    const data = this.state.data;
    return [
      <CheckIcon
        title='Save'
        value={cut != null}
        faIcon='fa fa-save'
        onChange={() => {
          if (!cut || !(cut instanceof VideoFileBase))
            return;

          cut.save({
            ...this.getCurrentFilter(),
            sourceId: this.props.model.getID()
          });
        }}
      />,
      <CheckIcon
        title='New cut'
        value
        faIcon='fa fa-plus'
        onChange={() => {
          this.props.model.append(this.getCurrentFilter());
        }}
      />,
      <CheckIcon
        title='Revert'
        value
        faIcon='fa fa-exchange'
        onChange={() => {
          this.state.data.reverse = !this.state.data.reverse;
          this.setState({});
        }}
      />,
      <CheckIcon
        title='Resize'
        faIcon='fa fa-arrows-alt'
        value={this.state.data.resize != null}
        onChange={() => {
          if (data.resize) {
            data.resize = null;
          } else if (data.crop) {
            data.resize = { width: data.crop.width, height: data.crop.height };
          } else {
            data.resize = this.props.model.getFrameSize();
          }
          this.setState({});
        }}
      />,
      <CheckIcon
        title='preview'
        faIcon='fa fa-image'
        value
        onClick={e => {
          e.stopPropagation();
          const {trim, reverse, fps, speed, ...other} = this.getCurrentFilter();
          this.props.model.appendImage({time: this.ref.current.state.time, ...other});
        }}
      />,
      <CheckIcon
        title='fps'
        faIcon='fa fa-film'
        value
        onClick={e => {
          e.stopPropagation();
          if (!data.fps) {
            const v = this.props.model.getDesc().streamArr.find(s => !!s.video);
            const origFps = v && v.video.fps ? v.video.fps : 25;
            data.fps = origFps;
          } else {
            data.fps = null;
          }
          this.setState({});
        }}
      />,
      <CheckIcon
        title='vertical flip'
        faIcon='fa fa-arrows-v'
        value
        onClick={e => {
          e.stopPropagation();
          if (!data.vflip) {
            data.vflip = true;
          } else {
            data.vflip = null;
          }
          this.setState({});
        }}
      />,
      <CheckIcon
        title='horizontal flip'
        faIcon='fa fa-arrows-h'
        value
        onClick={e => {
          e.stopPropagation();
          if (!data.hflip) {
            data.hflip = true;
          } else {
            data.hflip = null;
          }
          this.setState({});
        }}
      />,
      <CheckIcon
        title='speed'
        faIcon='fa fa-clock'
        value
        onClick={e => {
          e.stopPropagation();
          if (!data.speed) {
            data.speed = 1;
          } else {
            data.speed = null;
          }
          this.setState({});
        }}
      />,
      <CheckIcon
        title='no audio'
        faIcon='fa fa-volume-off'
        value
        onClick={e => {
          e.stopPropagation();
          if (!data.noaudio) {
            data.noaudio = true;
          } else {
            data.noaudio = null;
          }
          this.setState({});
        }}
      />,
      <CheckIcon
        title='export'
        faIcon='fa fa-upload'
        value
        onClick={e => {
          e.stopPropagation();
          this.props.model.export()
          .then((data: Object) => {
            let w = window.open();
            w.document.write(JSON.stringify(data, null, ' '));
          });
          this.setState({});
        }}
      />,
      <CheckIcon
        title='import'
        faIcon='fa fa-download'
        value
        onClick={e => {
          e.stopPropagation();
          this.import.current.click();
          this.setState({});
        }}
      />
    ];
  }

  renderVideo(): JSX.Element {
    const src = this.getPath();

    if (this.props.onlyContent) {
      return (
        <Video
          data={{ src: [src, this.props.model.holder.getVersion()].join('?') }}
          key={'video-' + this.props.model.holder.getID()}
        />
      );
    }

    const result = this.props.model.getPlayResultFile();
    if (result) {
      return (
        <Video
          data={{ src: [result.getPath(), result.holder.getVersion()].join('?') }}
          key={'res-' + result.holder.getID()}
          autoPlay
        />
      );
    }

    const file = this.props.model.getSelectFile();
    if (file instanceof ImageFile) {
      return (
        <div style={{
          flexGrow: 1,
          backgroundImage: `url(${file.getPath()})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}/>
      );
    }

    return (
      <Video
        ref={this.ref}
        data={this.state.data}
        tags={this.renderTags().filter(v => v)}
        toolbar={this.renderToolbar()}
      />
    );
  }

  getPath(): string {
    return this.props.model.getPath();
  }

  renderContent(): JSX.Element | string {
    const state = this.props.model;
    if (!state.isStatusValid()) // || state.getProgress() < 1)
      return null;

    return this.renderVideo();
  }

  import = React.createRef<HTMLInputElement>();
  onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.props.model.import(e.currentTarget.files.item(0));
  };

  render() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <div style={{ flexGrow: 1, display: 'flex', position: 'relative' }}>
          {this.renderContent()}
        </div>
        <input
          ref={this.import}
          type='file'
          onChange={this.onImport}
          style={{position: 'absolute', visibility: 'hidden', width: 0, height: 0}}
        />
      </div>
    );
  }
}
