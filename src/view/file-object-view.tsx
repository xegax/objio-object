import * as React from 'react';
import { FileObject } from '../client/file-object';

export interface Props {
  onlyContent?: boolean;
  model: FileObject;
}

const images = [ '.png', '.jpg', '.jpeg', '.gif' ];
export class FileObjectView extends React.Component<Props> {
  subscriber = () => {
    this.setState({});
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.subscriber);
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.subscriber);
  }

  renderImage(): JSX.Element {
    if (images.indexOf(this.props.model.getExt().toLowerCase()) == -1)
      return null;

    return <div style={{
      flexGrow: 1,
      backgroundImage: `url("${this.getPath()}?v=${this.props.model.holder.getVersion()}")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundSize: 'contain'
    }}/>;
  }

  getPath(): string {
    return this.props.model.getPath();
  }

  renderContent(): JSX.Element | string {
    const state = this.props.model.getState();
    if (!state.isValid() || state.getProgress() < 1)
      return null;

    return this.renderImage();
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
