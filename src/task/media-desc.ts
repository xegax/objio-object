export interface VideoStream {
  codec: string;
  width: number;
  height: number;
  fps?: number;
  pixelFmt: string;
  bitrate?: number;
}

export interface AudioStream {
  codec: string;
  freq: number;
  channels: number;
  bitrate: number;
}

export interface MediaStream {
  id: string;
  video?: VideoStream;
  audio?: AudioStream;
}
