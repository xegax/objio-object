import * as React from 'react';
import { SERIALIZER } from 'objio';
import { toString, Time } from '../task/time';
import { FileObject } from './file-object';
import { ClientView } from './client-class';
import { VideoFileView } from '../view/video-file-view';

export interface VideoFileDetails {
  duration: string;
}

export class VideoFileObject extends FileObject {
  protected details: Partial<VideoFileDetails> = {};

  getDetails(): Partial<VideoFileDetails> {
    return this.details;
  }

  split(args: {from: Time, to: Time, parentId: string}): Promise<void> {
    return this.holder.invokeMethod('split', args);
  }

  static toTime(timeSec: number): Time {
    let t: Time = {h: 0, m: 0, s: 0};
    t.h = Math.floor(timeSec / 3600);
    t.m = Math.floor(timeSec / 60);
    t.s = timeSec - (t.h * 3600 + t.m * 60);
    return t;
  }

  static toString(time: Time): string {
    return toString(time);
  }

  static TYPE_ID = 'VideoFileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...FileObject.SERIALIZE(),
    details:    { type: 'json' }
  })
  static getClientViews(): Array<ClientView> {
    return [
      {
        view: (props: {model: VideoFileObject}) => <VideoFileView {...props}/> 
      }
    ];
  }
}
