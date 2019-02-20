import * as React from 'react';
import { VideoFileObject } from '../client/video-file-object';
import { Video } from 'ts-react-ui/video';
import { FilterArgs } from '../base/video-file';
import { CheckBox } from 'ts-react-ui/checkbox';
import { CheckIcon } from 'ts-react-ui/checkicon';

export { VideoFileObject };

export interface Props {
  model: VideoFileObject;
}

export interface State {
}

export class VideoFileView extends React.Component<Props, Partial<State>> {
  state: Partial<State> = {};
  ref = React.createRef<Video>();

  subscriber = () => {
    this.setState({});
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.subscriber);
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.subscriber);
  }

  renderVideo(): JSX.Element {
    let file = this.getPath();
    let result = this.props.model.getPlayResultFile();
    if (result) {
      return (
        <Video src={result.getPath()} key={result.holder.getID()}/>
      );
    }

    let cut = this.props.model.getSelectFile();
    let filter: FilterArgs;
    if (cut)
      filter = cut.getFilter();

    const trim = filter && filter.trim && {...filter.trim} || null;
    return (
      <Video
        ref={this.ref}
        key={cut && cut.holder.getID() || null}
        src={file}
        defaultTrim={trim}
        defaultTime={trim && trim.from || 0}
        toolbar={[
          <CheckIcon
            title='Save'
            value={cut != null}
            faIcon='fa fa-save'
            onChange={() => {
              if (!cut)
                return;

              const s = this.ref.current.state;
              let filter: FilterArgs = {
                trim: s.trim ? {...s.trim} : null
              };

              cut.save(filter);
            }}
          />,
          <CheckIcon
            title='New cut'
            value
            faIcon='fa fa-plus'
            onChange={() => {
              const s = this.ref.current.state;
              let filter: FilterArgs = {
                trim: s.trim ? {...s.trim} : null
              };

              this.props.model.append(filter);
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
