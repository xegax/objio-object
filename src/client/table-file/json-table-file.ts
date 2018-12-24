import { JSONTableFile as Base } from '../../base/table-file/json-table-file';
import { SendFileArgs } from '../../base/file-object';

export class JSONTableFile extends Base {
  sendFile(args: SendFileArgs): Promise<any> {
    return this.holder.invokeMethod({
      method: 'send-file',
      args: args.file,
      onProgress: args.onProgress
    });
  }

  getDataReading() {
    throw new Error('not implemented');
    return null;
  }

  onFileUploaded() {
    return Promise.resolve();
  }
}
