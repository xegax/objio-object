import * as React from 'react';
import { ObjectBase } from '../base/object-base';

interface Props {
  model: ObjectBase;
}

const images = [ '.png', '.jpg', '.jpeg', '.gif' ];

export class ObjectBaseView extends React.Component<Props> {
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
    const fs = this.props.model.getFS();
    if (!fs)
      return null;

    let content = fs.getPath('content');
    if (!content)
      return null;

    const file = content.split('?')[0];
    if (!images.some(ext => file.endsWith(ext)))
      return null;

    return (
      <div style={{
        flexGrow: 1,
        backgroundImage: `url("${fs.getPath('content')}")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'contain'
      }}/>
    );
  }

  renderContent() {
    return this.renderImage();
  }

  render() {
    return (
      <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1}}>
        <div style={{flexGrow: 1, display: 'flex', position: 'relative'}}>
          {this.renderContent()}
        </div>
      </div>
    );
  }
}
