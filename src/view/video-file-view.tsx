import * as React from 'react';
import { VideoFileObject } from '../client/video-file-object';
import { Video, VideoData } from 'ts-react-ui/video';
import { FilterArgs, VideoFileBase } from '../base/video-file';
import { Tag, EditValue } from 'ts-react-ui/timeline';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { Size } from '../common/point';
import { ImageFile } from '../client/image-file';
import { FitToParent } from 'ts-react-ui/fittoparent';

export { VideoFileObject };

export interface VideoDataExt extends VideoData {
  reverse?: boolean;
  resize?: Size;
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
          resize: filter.resize
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
      resize: data.resize ? {...data.resize} : null
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
      )
    ];
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

          cut.save(this.getCurrentFilter());
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
          const {trim, ...other} = this.getCurrentFilter();
          this.props.model.appendImage({time: this.ref.current.state.time, ...other});
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
