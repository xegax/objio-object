import { SERIALIZER } from 'objio';
import { ObjectBase } from './object-base';

export interface YTContent {
  id?: string;
  type?: 'playlist' | 'video';
}

export class YoutubeBase extends ObjectBase {
  protected url: string = '';
  protected play: boolean = true;
  protected time: number = 0;
  protected index: number = 0;
  protected content: YTContent = {};

  getIndex() {
    return this.index;
  }

  getPlay() {
    return this.play;
  }

  getURL(): string {
    let url = 'https://www.youtube.com/embed';
    let p: YT.PlayerVars = {
      autoplay: 1,
      enablejsapi: 1
    };

    const { id, type } = this.content; 
    if (id && type == 'playlist') {
      p.list = id;
      p.listType = 'playlist' as any;
    } else if (id && type == 'video') {
      url += `/${id}`;
    }

    const params = Object.keys(p).map(k => `${k}=${p[k]}`).join('&');
    if (params.length)
      url += '?' + params;

    return url;
  }

  static TYPE_ID = 'YoutubePlayer';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    content: { type: 'json' },
    play: { type: 'number' },
    time: { type: 'number' },
    index: { type: 'number' }
  });
}
