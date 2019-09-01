import * as React from 'react';
import { Youtube } from '../client/youtube';

export { Youtube };

export interface YTProps {
  model: Youtube;
}

export class YoutubeView extends React.Component<YTProps> {
  componentDidUpdate() {
    this.props.model.componentDidUpdate();
  }

  render() {
    const url = this.props.model.getURL(); 
    const props = {
      id: 'player',
      width: '100%',
      height: '100%',
      src: url,
      style: { border: 'none' },
      allowFullscreen: true,
      allow: 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'
    };

    return (
      <div style={{display: 'flex', flexGrow: 1, flexDirection: 'column', position: 'relative'}}>
        <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0}}>
          <iframe
            key={url}
            ref={this.props.model.getPlayerRef()}
            {...props}
          />
        </div>
      </div>
    );
  }
}
