import { FileObjImpl } from './file-obj-impl';
import { SERIALIZER } from 'objio';
import { toSeconds, parseTime, toString, Time } from './task/time';

export class VideoFileObject extends FileObjImpl {
  protected duration: string;

  getDurationSec(): number {
    if (!this.duration)
      return 0;
    return toSeconds(parseTime(this.duration));
  }

  split = (args: {from: Time, to: Time, parentId: string}): Promise<void> => {
    return this.holder.invokeMethod('split', args);
  }

  static toTime(timeSec: number): Time {
    let t: Time = {h: 0, m: 0, s: 0};
    t.h = Math.floor(timeSec / 3600);
    t.m = Math.floor(timeSec / 60);
    t.s = timeSec - (t.h * 3600 + t.m * 60);
    return t;
  }

  static timeToStr(time: Time): string {
    return toString(time);
  }

  static TYPE_ID = 'VideoFile';
  static SERIALIZE: SERIALIZER = () => ({
    ...FileObjImpl.SERIALIZE(),
    duration: { type: 'string' }
  })
}
