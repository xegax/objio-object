import { runTask } from './task';
import { existsSync, unlinkSync } from 'fs';
import { normalize } from 'path';
import { Time, parseTime, getString, getSeconds } from '../common/time';
import { MediaStream } from './media-desc';
import { Rect } from '../common/point';
import { Size } from 'ts-react-ui/common/point';
import * as p from './parser';

function parseDuration(info: InputInfo): Time {
  const t = info.duration.split(', ')[0];
  if (t == 'N/A')
    return null;

  return parseTime(t);
}

interface InputInfo {
  input: string;
  duration?: string;
  stream: Array<string>;
}

export interface FileInfo {
  stream: Array<string>;
  duration: Time;
}

export function parseStream(strm: string): MediaStream {
  let ctx = { str: strm, pos: 0 };
  // p.readNext('Stream ', ctx);
  const id = p.readStreamID(ctx);
  if (strm[ctx.pos] == '(')
    p.readBracet(ctx, '(', ')');
  p.readNext(': ', ctx);
  const type = p.readOneOf(['Video', 'Audio', 'Subtitle', 'Data'], ctx);
  p.readNext(': ', ctx);
  
  const m: MediaStream = { id };
  if (type == 'Video') {
    const codec = p.readUntil(',', ctx);
    const fmt = p.readUntil(',', ctx);
    const size = p.readSize(ctx);
    let other = new Array<string>();
    try {
      while (other.length < 5) {
        other.push(p.readUntil(',', ctx));
      }
    } catch (e) {
    }

    m.video = {
      codec,
      pixelFmt: fmt,
      width: size.width,
      height: size.height
    };
    const fps = other.find(v => v.endsWith('fps'));
    fps && (m.video.fps = +fps.trim().split(' ')[0]);
  } else if (type == 'Audio') {
    const codec = p.readUntil(',', ctx);
    const freq = p.readUntil(',', ctx);
    const channels = p.readUntil(',', ctx).trim();
    p.readUntil(',', ctx);
    const bitrate = p.readUntil(',', ctx);
    m.audio = {
      codec,
      freq: parseInt(freq, 10),
      channels: { '5.1(side)': 5, 'stereo': 2, 'mono': 1 }[channels],
      bitrate: parseFloat(bitrate)
    };
  }

  return m;
}

function parseInputDetails(lines: Array<string>): Array<InputInfo> {
  let inputs = Array<InputInfo>();
  let curr: InputInfo;
  lines.forEach(line => {
    if (line.startsWith('Input #')) {
      curr = { input: line.trim().substr(6), stream: [] };
      inputs.push(curr);
    } else if (line.startsWith('  Duration:')) {
      curr.duration = line.trim().substr(10);
    } else if (line.startsWith('    Stream #')) {
      curr.stream.push(line.trim().substr(7));
    }
  });

  return inputs;
}

function getFileInfo(input: InputInfo): FileInfo {
  return {
    duration: parseDuration(input),
    stream: input.stream
  };
}

export function parseMedia(file: string): Promise<FileInfo> {
  let bufs = Array<Buffer>();

  const parse = (): FileInfo | Promise<any> => {
    const buff = Buffer.concat(bufs);
    const inputs = parseInputDetails(buff.toString().split('\n'));
    if (inputs && inputs.length)
      return getFileInfo(inputs[0]);

    return Promise.reject('parse media is failed');
  };

  return (
    runTask({
      cmd: process.env['FFMPEG'] || 'ffmpeg.exe',
      args: ['-i', `"${normalize(file)}"`],
      handleOutput: args => {
        bufs.push(args.data);
      }
    })
    .then(parse)
    .catch(parse)
  );
}

export interface Range {
  from: Partial<Time>;
  to: Partial<Time>;
}

export interface EncodeArgs {
  inFile: Array<string>;
  outFile: string;
  overwrite?: boolean;

  vframes?: number;
  range?: Partial<Range>;
  crop?: Rect;
  reverse?: boolean;
  resize?: Size;
  fps?: number;
  codecA?: string;
  codecV?: string;
  onProgress?(t: number): void;
}

export function encodeFile(args: EncodeArgs): Promise<FileInfo> {
  if (existsSync(args.outFile)) {
    if (args.overwrite)
      unlinkSync(args.outFile);
    else
      return Promise.reject(`outFile = ${args.outFile} already exists`);
  }

  return (
    Promise.all( args.inFile.map(file => parseMedia(file)) )
    .then(infoArr => {
      const argsArr = [];
      if (args.range && args.range.from)
        argsArr.push('-ss', getString(args.range.from));

      args.inFile.forEach(file => {
        argsArr.push(
          '-i',
          normalize(file)
        );
      });

      let duration = 0;
      infoArr.forEach(info => {
        duration += getSeconds(info.duration);
      });

      if (args.range) {
        const { from, to } = args.range;

        if (from && to) {
          duration = getSeconds(to) - getSeconds(from);
        } else if (from) {
          duration = duration - getSeconds(from);
        } else if (to) {
          duration = getSeconds(to);
        }

        if (to)
          argsArr.push('-t', duration);
      }

      let filterComplexArr = [];
      if (args.inFile.length > 1) {
        filterComplexArr.push(`concat=n=${args.inFile.length}:v=1:a=1`);
      }

      if (args.crop) {
        const crop = [
          args.crop.width,
          args.crop.height,
          args.crop.x,
          args.crop.y
        ]
        .map(v => Math.floor(v))
        .join(':');
        filterComplexArr.push(`crop=${crop}`);
      }

      if (args.reverse) {
        filterComplexArr.push(`trim=duration=${duration}`);
        filterComplexArr.push('setpts=PTS-STARTPTS');
        filterComplexArr.push('reverse');
      }

      if (filterComplexArr.length)
        argsArr.push('-filter_complex', filterComplexArr.join(','));

      if (args.codecV)
        argsArr.push(`-c:v ${args.codecV}`);

      if (args.codecA)
        argsArr.push(`-c:a ${args.codecA}`);

      if (args.resize)
        argsArr.push(`-s ${args.resize.width}x${args.resize.height}`);

      if (args.vframes)
        argsArr.push(`-vframes ${args.vframes}`);

      if (args.fps)
        argsArr.push(`-r ${args.fps}`);

      argsArr.push(normalize(args.outFile));
      return runTask({
        cmd: process.env['FFMPEG'] || 'ffmpeg.exe',
        args: argsArr,
        handleOutput: out => {
          const s = out.data.toString();
          if (s.startsWith('frame=')) {
            let f = s.indexOf('time=');
            let e = s.indexOf(' bitrate=');
            const t = parseTime(s.substr(f, e - f).split('=')[1]);
            args.onProgress && args.onProgress(Math.min(1, getSeconds(t) / duration));
          }
        }
      })
      .then(() => infoArr[0]);
    })
  );
}
