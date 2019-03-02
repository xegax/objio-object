import { runTask } from './task';
import { existsSync, unlinkSync } from 'fs';
import { normalize } from 'path';
import { Time, parseTime, getString, getSeconds } from '../common/time';
import { MediaStream } from './media-desc';
import { Rect } from '../common/point';

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
  let idPos = strm.indexOf(': ');
  if (idPos == -1)
    return null;

  const m: MediaStream = { id: strm.substr(0, idPos) };
  let typePos = strm.indexOf(': ', idPos + 2);
  if (typePos == -1)
    return m;

  let type = strm.substr(idPos + 2, typePos - idPos - 2).trim();
  const props = strm.substr(typePos + 2).split(', ');
  if (type == 'Video') {
    const size = props[2].split('x');
    m.video = {
      codec: props[0],
      pixelFmt: props[1],
      width: parseInt(size[0], 10),
      height: parseInt(size[1], 10),
      bitrate: parseFloat(props[3]),
      fps: parseFloat(props[5])
    };
  } else if (type == 'Audio') {
    m.audio = {
      codec: props[0],
      freq: parseFloat(props[1]),
      channels: { 'stereo': 2, 'mono': 1 }[props[2]],
      bitrate: parseFloat(props[4])
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
  inFile: string;
  outFile: string;
  overwrite?: boolean;

  range?: Partial<Range>;
  crop?: Rect;
  reverse?: boolean;
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
    parseMedia(args.inFile)
    .then(info => {
      const argsArr = [];
      if (args.range && args.range.from)
        argsArr.push('-ss', getString(args.range.from));

      argsArr.push(
        '-i',
        normalize(args.inFile)
      );

      let duration = getSeconds(info.duration);
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
      .then(() => info);
    })
  );
}
