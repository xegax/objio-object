import { FileObject as Base, FileArgs } from '../file-object';
import { SERIALIZER } from 'objio';
import { createWriteStream, unlinkSync, existsSync } from 'fs';
import * as http from 'http';

export class FileObject extends Base {
  constructor(args?: FileArgs) {
    super(args);

    this.holder.addEventHandler({
      onDelete: () => {
        try {
          const file = this.getPath();
          console.log('removing content file', file);
          if (existsSync(file))
            unlinkSync(this.getPath());
        } catch (e) {
          console.log(e);
        }
        return Promise.resolve();
      }
    });

    this.holder.setMethodsToInvoke({
      'send-file': this.sendFileImpl
    });
  }

  sendFileImpl = (args: { data: http.IncomingMessage }): Promise<void> => {
    this.state.setProgress(0);
    this.state.setStateType('in progress');

    return new Promise(resolve => {
      args.data.pipe(createWriteStream(this.getPath()));
      args.data.on('data', chunk => {
        if (typeof chunk == 'string')
          this.loadSize += chunk.length;
        else
          this.loadSize += chunk.byteLength;

        this.state.setProgress(this.loadSize / this.size);
        this.holder.save();
      });
      args.data.on('end', () => {
        this.onFileUploaded().then(() => {
          this.state.setStateType('valid');
          this.state.setProgress(1);
          this.state.save();
          this.holder.save();
          resolve();
        });
      });
    });
  }

  onFileUploaded(): Promise<void> {
    return Promise.resolve();
  }

  getPath(): string {
    return this.holder.getFilePath(super.getPath());
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...Base.SERIALIZE()
  })
}
