import { runTask } from './task';
import { existsSync, unlinkSync } from 'fs';
import { normalize } from 'path';
import { Time, parseTime, getString, getSeconds } from '../common/time';
import { MediaStream } from './media-desc';
import { Rect } from '../common/point';
import { Size } from 'ts-react-ui/common/point';
import * as p from './parser';
import * as process from 'process';

function parseDuration(info: InputInfo): Time {
  const t = info.duration.split(', ')[0];
  if (t == 'N/A')
    return null;

  return parseTime(t);
}

interface StreamData {
  info: string;
  sidedata: Array<{key: string; value: string}>;
  metadata: Array<{key: string; value: string}>;
}

interface InputInfo {
  input: string;
  duration?: string;
  stream: Array<StreamData>;
}

export interface FileInfo {
  stream: Array<StreamData>;
  duration: Time;
}

export function parseStream(strm: StreamData): MediaStream {
  let ctx = { str: strm.info, pos: 0 };
  // p.readNext('Stream ', ctx);
  const id = p.readStreamID(ctx);
  if (ctx.str[ctx.pos] == '(')
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

    if (strm.sidedata.some(kv => kv.key == 'displaymatrix' && kv.value == 'rotation of -90.00 degrees')) {
      let tmp = size.width;
      size.width = size.height;
      size.height = tmp;
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
  let currStrm: StreamData;
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    if (line.startsWith('Input #')) {
      curr = { input: line.trim().substr(6), stream: [] };
      inputs.push(curr);
    } else if (line.startsWith('  Duration:')) {
      curr.duration = line.trim().substr(10);
    } else if (line.startsWith('    Stream #')) {
      currStrm = { info: line.trim().substr(7), metadata: [], sidedata: [] };
      curr.stream.push(currStrm);
    } else if (line.startsWith('    Side data:') || line.startsWith('    Metadata:')) {
      const key = line.trim();
      let i = n + 1;
      while (i < lines.length) {
        const line = lines[i];
        if (line.substr(0, 6) == '      ' && line[7] != ' ') {
          const split = line.indexOf(':');
          const keyVal = {
            key: line.substr(0, split).trim(),
            value: line.substr(split + 1).trim()
          };

          if (key.startsWith('Side data:'))
            currStrm.sidedata.push(keyVal);
          else if (key.startsWith('Metadata:'))
            currStrm.metadata.push(keyVal);
        } else {
          n = i - 1;
          break;
        }
        i++;
      }
    }
  }

  console.log(JSON.stringify(inputs, null, ' '));
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
      cmd: process.env['FFMPEG'] || 'ffmpeg',
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
  inputFPS?: number;
  hflip?: boolean;
  vflip?: boolean;
  codecA?: string;
  codecV?: string;
  noaudio?: boolean;
  stabilize?: boolean;
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

      if (args.inputFPS)
        argsArr.push('-r', args.inputFPS);

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

      if (args.hflip)
        filterComplexArr.push('hflip');

      if (args.vflip)
        filterComplexArr.push('vflip');

      if (args.resize)
        argsArr.push(`-s ${args.resize.width}x${args.resize.height}`);

      if (args.vframes)
        argsArr.push(`-vframes ${args.vframes}`);

      if (args.fps)
        argsArr.push(`-r ${args.fps}`);

      let p = Promise.resolve();
      let stabDataFile = normalize(args.outFile) + '.trf';
      if (args.stabilize) {
        const filters = [
          ...filterComplexArr,
          `vidstabdetect=shakiness=10:accuracy=15:result="${stabDataFile}"`
        ].join(',');

        p = runTask({
          cmd: process.env['FFMPEG'] || 'ffmpeg',
          args: [
            ...argsArr,
            `-filter_complex ${filters}`,
            `-f null -`
          ],
          handleOutput: out => {
            const s = out.data.toString();
            if (s.startsWith('frame=')) {
              let f = s.indexOf('time=');
              let e = s.indexOf(' bitrate=');
              const t = parseTime(s.substr(f, e - f).split('=')[1]);
              args.onProgress && args.onProgress(Math.min(1, getSeconds(t) / duration));
            }
          }
        }).then(() => {});
      }

      return p.then(() => {
        const filters = [
          ...filterComplexArr,
          ...(args.stabilize ? [`vidstabtransform=zoom=5:smoothing=30:input=${stabDataFile},unsharp=5:5:0.8:3:3:0.4`] : [])
        ].join(',');

        if (filters.length)
          argsArr.push(`-filter_complex ${filters}`);

        if (args.codecV)
          argsArr.push(`-c:v ${args.codecV}`);

        if (args.codecA)
          argsArr.push(`-c:a ${args.codecA}`);

        if (args.noaudio)
          argsArr.push('-an');

        argsArr.push(normalize(args.outFile));

        return runTask({
          cmd: process.env['FFMPEG'] || 'ffmpeg',
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
    })
  );
}
