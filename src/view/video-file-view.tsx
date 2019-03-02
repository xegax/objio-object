import * as React from 'react';
import { VideoFileObject } from '../client/video-file-object';
import { Video } from 'ts-react-ui/video';
import { FilterArgs } from '../base/video-file';
import { Tag } from 'ts-react-ui/timeline';
import { CheckIcon } from 'ts-react-ui/checkicon';

export { VideoFileObject };

export interface Props {
  onlyContent?: boolean;
  model: VideoFileObject;
}

export interface State {
  reverse?: boolean;
}

export class VideoFileView extends React.Component<Props, Partial<State>> {
  state: Partial<State> = {};
  ref = React.createRef<Video>();

  subscriber = () => {
    const state: State = {};

    const file = this.props.model.getSelectFile();
    if (file) {
      const filter = file.getFilter();
      state.reverse = filter.reverse;
    }

    this.setState(state);
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.subscriber);
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.subscriber);
  }

  getCurrentFilter(): FilterArgs {
    const s = this.ref.current.state;
    return {
      trim: s.trim ? {...s.trim} : null,
      reverse: this.state.reverse
    };
  }

  renderVideo(): JSX.Element {
    const src = this.getPath();

    if (this.props.onlyContent) {
      return (
        <Video
          src={[src, this.props.model.holder.getVersion()].join('?')}
          key={'video-' + this.props.model.holder.getID()}
        />
      );
    }

    const result = this.props.model.getPlayResultFile();
    if (result) {
      return (
        <Video
          src={[result.getPath(), result.holder.getVersion()].join('?')}
          key={'res-' + result.holder.getID()}
          autoPlay
        />
      );
    }

    const cut = this.props.model.getSelectFile();
    let filter: FilterArgs = {};
    if (cut)
      filter = cut.getFilter();

    const trim = filter.trim ? {...filter.trim} : null;
    return (
      <Video
        ref={this.ref}
        key={cut && cut.holder.getID() || null}
        src={src}
        defaultTrim={trim}
        defaultTime={trim && trim.from || 0}
        tags={[
          this.state.reverse && (
            <Tag color='#DEFFDD' onRemove={() => { this.setState({ reverse: false }); }}>
              reverse
            </Tag>
          )
        ].filter(v => v)}
        toolbar={[
          <CheckIcon
            title='Save'
            value={cut != null}
            faIcon='fa fa-save'
            onChange={() => {
              if (!cut)
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
              this.setState({ reverse: !this.state.reverse });
            }}
          />
        ]}
      />
    );
  }

  getPath(): string {
    return this.props.model.getPath();
  }

  renderContent(): JSX.Element | string {
    const state = this.props.model;
    if (!state.isStatusValid()) //|| state.getProgress() < 1)
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
