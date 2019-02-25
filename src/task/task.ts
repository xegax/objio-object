import { exec } from 'child_process';

export interface HandlerArgs {
  type: 'stderr' | 'stdout';
  data: Buffer;
}

export interface TaskArgs {
  cmd: string;
  args?: Array<string>;
  handleOutput?(args: HandlerArgs): void;
}

export interface TaskResult {
  totalOutBytes: number;
}

export function runTask(args: TaskArgs): Promise<TaskResult> {
  args = {
    args: (args.args || []).map(v => `"${v}"`),
    ...args
  };

  let totalOutBytes = 0;
  let cmd = [args.cmd, ...args.args].join(' ');
  console.log(cmd);

  return new Promise((resolve, reject) => {
    const task = exec(cmd, err => {
      if (err)
        return reject(err);

      resolve({ totalOutBytes });
    });

    const getOutput = (type: 'stderr' | 'stdout' ) => (data: string | Buffer) => {
      const buf = data instanceof Buffer ? data : new Buffer(data);
      totalOutBytes += buf.byteLength;
      if (args.handleOutput)
        args.handleOutput({ type: 'stderr', data: buf });
    };

    task.stderr.on('data', getOutput('stderr'));
    task.stdout.on('data', getOutput('stdout'));
  });
}
