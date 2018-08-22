import { runTask } from './task';
import { existsSync, unlinkSync } from 'fs';
import { normalize } from 'path';
import { Time, parseTime, toString, toSeconds } from './time';

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

export function parseFile(file: string): Promise<FileInfo> {
  let bufs = Array<Buffer>();
  return runTask({
    cmd: 'ffmpeg.exe',
    args: ['-i', normalize(file)],
    handleOutput: args => {
      bufs.push(args.data);
    }
  })
  .then(() => null)
  .catch(() => {
    const buff = Buffer.concat(bufs);
    const inputs = parseInputDetails(buff.toString().split('\n'));
    return getFileInfo(inputs[0]);
  });
}

export interface Range {
  from: Partial<Time>;
  to: Partial<Time>;
}

export interface EncodeArgs {
  inFile: string;
  outFile: string;
  range?: Partial<Range>;
  overwrite?: boolean;
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
    parseFile(args.inFile)
    .then(info => {
      const argsArr = [
        '-i',
        normalize(args.inFile)
      ];

      let duration = toSeconds(info.duration);
      if (args.range) {
        const { from, to } = args.range;
        if (from)
          argsArr.push('-ss', toString(from));
        if (to)
          argsArr.push('-to', toString(to));

        if (from && to) {
          duration = toSeconds(to) - toSeconds(from);
        } else if (from) {
          duration = duration - toSeconds(from);
        } else if (to) {
          duration = toSeconds(to);
        }
      }

      argsArr.push(normalize(args.outFile));
      return runTask({
        cmd: 'ffmpeg.exe',
        args: argsArr,
        handleOutput: out => {
          const s = out.data.toString();
          if (s.startsWith('frame=')) {
            let f = s.indexOf('time=');
            let e = s.indexOf(' bitrate=');
            const t = parseTime(s.substr(f, e - f).split('=')[1]);
            args.onProgress && args.onProgress(Math.min(1, toSeconds(t) / duration));
          }
        }
      })
      .then(() => info);
    })
  );
}