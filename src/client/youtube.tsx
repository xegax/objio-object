import * as React from 'react';
import { YoutubeBase } from '../base/youtube';
import { ObjProps } from '../base/object-base';
import { PropsGroup, TextPropItem, SwitchPropItem } from 'ts-react-ui/prop-sheet';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { prompt } from 'ts-react-ui/prompt';

let p: YT.Player;

let iframeApi: HTMLScriptElement;
function injectIFRAMEAPI(): Promise<void> {
  if (iframeApi)
    return Promise.resolve();

  iframeApi = document.createElement('script');
  iframeApi.src = 'https://www.youtube.com/iframe_api';

  return new Promise<void>(resolve => {
    window['onYouTubeIframeAPIReady'] = () => {
      resolve();
      console.log('onYouTubeIframeAPIReady');
    };
    document.head.appendChild(iframeApi);
  });
}

function getPlayerAPI(el: HTMLIFrameElement): Promise<YT.Player> {
  let res = Promise.resolve(p);

  if (!p || p.getIframe() != el) {
    res = injectIFRAMEAPI()
    .then(() => {
      return p = new YT.Player(el, {});
    });
  }

  return res;
}

export class Youtube extends YoutubeBase {
  protected ref = React.createRef<HTMLIFrameElement>();
  protected takeControl: boolean = false;
  protected lastIframe: HTMLIFrameElement;
 
  constructor() {
    super();

    // this.checkPlayerState();
    this.holder.addEventHandler({
      onObjChange: () => {
        this.getPlayer()
        .then(p => {
          console.log(this.index, this.play, this.time);
          if (p.getPlaylistIndex() != this.index)
            p.playVideoAt(this.index);

          const s = p.getPlayerState();
          if (s == YT.PlayerState.PAUSED && this.play) {
            p.seekTo(this.time, true);
            p.playVideo();
          } else if (s == YT.PlayerState.PLAYING && !this.play) {
            p.pauseVideo();
          }
        });
      }
    });
  }

  getPlayerRef() {
    return this.ref;
  }

  el: HTMLElement;
  componentDidUpdate() {
    if (this.ref.current == this.el)
      return;

    this.el = this.ref.current;

    this.getPlayer()
    .then(p => {
      p.addEventListener('onReady', this.onReady);
      p.addEventListener('onStateChange', this.onStateChange);
    });
  }

  private onReady = (evt: YT.PlayerEvent) => {
    if (this.index != p.getPlaylistIndex())
      p.playVideoAt(this.index);
    p.playVideo();
  };

  private onStateChange = (evt: YT.OnStateChangeEvent) => {
    const p = evt.target;
    const s = p.getPlayerState();
    const t = p.getCurrentTime();
    const i = p.getPlaylistIndex();

    const play = s == YT.PlayerState.PLAYING;
    if (!this.takeControl)
      return;

    if (i != this.index) {
      this.time = 0;
      this.index = i;
      this.holder.save();
    } else if (play != this.play) {
      this.play = play;
      this.time = t;
      this.holder.save();
    }
  };

  getPlayer() {
    return getPlayerAPI(this.ref.current);
  }

  getObjPropGroups(props: ObjProps) {
    return (
      <>
        <PropsGroup label='config'>
          <div className='horz-panel-1 flexrow'>
            <div style={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis'}}>
              {this.content.type}: {this.content.id}
            </div>
            <CheckIcon
              title='set playlist id'
              faIcon='fa fa-list-ul'
              value
              onClick={() => {
                prompt({ value: this.content.id })
                .then(v => {
                  this.content.id = v;
                  this.content.type = 'playlist';
                  this.index = 0;
                  this.time = 0;
                  this.holder.save();
                });
              }}
            />
            <CheckIcon
              title='set video id'
              faIcon='fa fa-file-video-o'
              value
              onClick={() => {
                prompt({ value: this.content.id })
                .then(v => {
                  this.content.id = v;
                  this.content.type = 'video';
                  this.index = 0;
                  this.time = 0;
                  this.holder.save();
                });
              }}
            />
          </div>
          <SwitchPropItem
            label='take control'
            value={this.takeControl}
            onChanged={v => {
              this.takeControl = v;
              this.holder.delayedNotify();
            }}
          />
        </PropsGroup>
      </>
    );
  }
}
