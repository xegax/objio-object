import { CSVTableFile as Base } from '../../base/table-file/csv-table-file';
import { SendFileArgs } from '../../base/file-object';

export class CSVTableFile extends Base {
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
