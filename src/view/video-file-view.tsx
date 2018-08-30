import * as React from 'react';
import { FitToParent } from 'ts-react-ui/fittoparent';
import { VideoFileObject } from '../client/video-file-object';

export interface Props {
  onlyContent?: boolean;
  model: VideoFileObject;
}

export class VideoFileView extends React.Component<Props> {
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
    return (
      <div style={{display: 'flex', flexGrow: 1, flexDirection: 'column'}}>
        <FitToParent wrapToFlex>
          <video controls src={`${this.getPath()}?${this.props.model.holder.getVersion()}`}/>
        </FitToParent>
      </div>
    );
  }

  getPath(): string {
    return this.props.model.getPath();
  }

  renderContent(): JSX.Element | string {
    const state = this.props.model.getState();
    if (!state.isValid() || state.getProgress() < 1)
      return null;

    return this.renderVideo();
  }

  render() {
    const model = this.props.model;
    return (
      <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1}}>
        {this.props.onlyContent != true ? <div>
          <div>name: {model.getName()}</div>
          <div>size: {model.getSize()}</div>
          <div>mime: {model.getMIME()}</div>
          <div>loaded: {model.getLoadSize()}</div>
          <div>progress: {model.getState().getProgress()}</div>
          <div>{model.getState().getType()}</div>
        </div> : null}
        <div style={{flexGrow: 1, display: 'flex', position: 'relative'}}>
          {this.renderContent()}
        </div>
      </div>
    );
  }
}
