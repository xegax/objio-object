import { OBJIOItem, SERIALIZER, OBJIOItemClass } from 'objio';
import { Flag, ConfigProps } from '../common/view-factory';

export type Status = 'ok' | 'error' | 'not configured' | 'in progress';
export interface ObjProps {
  objects(filter?: Array<OBJIOItemClass>): Array<ObjectBase>;
}

export interface SendFileArgs {
  file: File;
  fileId?: string;
  other?: string;
  onProgress?(value: number): void;
}

export interface ObjectBaseArgs {
  status: Status;
  progress: number;
}

export interface ClientView {
  viewType?: string;
  view(props: {model: OBJIOItem}): JSX.Element;
}

export interface ViewDescIcon {
  item?: JSX.Element;
  bigDesc?: JSX.Element;
}

export interface ViewDesc {
  desc: string;
  icons?: ViewDescIcon;
  flags: Set<Flag> | Array<Flag>;
  views: Array<ClientView>;
  config(props: ConfigProps): JSX.Element;
  create?(): ObjectBase;
  sources: Array<Array<OBJIOItemClass>>;
}

export interface ObjectsFolder {
  name?: string;
  icon?: string;
  objects: Array<ObjectBase>;
}

export class ObjectBase extends OBJIOItem {
  protected name: string;
  protected progress: number = 0;
  protected status: Status = 'ok';
  protected errors = Array<string>();

  constructor(args?: Partial<ObjectBaseArgs>) {
    super();

    if (args) {
      this.status = args.status || this.status;
      this.progress = args.progress || this.progress;
    }
  }

  getChildren(): Array<ObjectsFolder> {
    return [];
  }

  getChildNum() {
    return this.getChildren().length;
  }

  subscribe(handler: () => void) {
    this.holder.subscribe(handler);
  }

  unsubscribe(handler: () => void) {
    this.holder.unsubscribe(handler);
  }

  getObjType(): string {
    return OBJIOItem.getClass(this).TYPE_ID;
  }

  getID() {
    return this.holder.getID();
  }

  getVersion(): string {
    return this.holder.getVersion();
  }

  getName(): string {
    return this.name;
  }

  setName(name: string): void {
    if (name == this.name)
      return;

    this.name = name;
    this.holder.save();
    this.holder.delayedNotify();
  }

  getStatus(): Status {
    return this.status;
  }

  setStatus(value: Status): void {
    if (this.status == value)
      return;

    this.status = value;
    this.holder.save();
    this.holder.delayedNotify();
  }

  isStatusValid(): boolean {
    return this.status == 'ok';
  }

  isStatusInProgess(): boolean {
    return this.status == 'in progress';
  }

  setProgress(value: number): void {
    let newValue = Math.round(value * 100) / 100;
    if (newValue == this.progress)
      return;

    this.progress = newValue;
    this.holder.save();
    this.holder.delayedNotify();
  }

  getProgress(): number {
    return this.progress;
  }

  addError(err: string): void {
    this.errors.push(err);
    this.holder.save();
    this.holder.delayedNotify();
  }

  clearErrors(): void {
    if (this.holder.isClient())
      return;

    this.errors = [];
    this.holder.save();
    this.holder.delayedNotify();
  }

  getErrors(): Array<string> {
    return this.errors;
  }

  getAppComponents(): Array<JSX.Element> {
    return [];
  }

  getObjPropGroups(props: ObjProps): JSX.Element {
    return null;
  }

  sendFile(args: SendFileArgs): Promise<any> {
    return this.holder.invokeMethod({
      method: 'sendFile',
      args: { file: args.file, fileId: args.fileId, other: args.other },
      onProgress: args.onProgress
    });
  }

  static getViewDesc(): Partial<ViewDesc> {
    return {
      desc: '',
      flags: [],
      views: [],
      config: (props: ConfigProps) => {
        return null;
      },
      sources: []
    };
  }

  static TYPE_ID = 'ObjectBase';
  static SERIALIZE: SERIALIZER = () => ({
    name:     { type: 'string' },
    progress: { type: 'number', const: true },
    status:   { type: 'string', const: true },
    errors:   { type: 'json', const: true }
  })
}
