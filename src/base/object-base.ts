import { OBJIOItem, SERIALIZER, OBJIOItemClass, FileSystemSimple } from 'objio';
import { Flag, ConfigProps } from '../common/view-factory';
import { Timer } from 'objio/common/timer';

export type IconType = 'tree-icon';
export type Status = 'ok' | 'error' | 'not configured' | 'in progress';

export interface ObjInfo {
  id: string;
  name: string;
  type: string;
}

export type ObjInfoProv = () => ObjInfo;

export interface ObjProps {
  objects(filter?: Array<OBJIOItemClass>): Array<ObjInfoProv>;
  append(newObj: ObjectBase): Promise<void>;
}

export interface ObjectBaseArgs {
  status: Status;
  progress: number;
}

export interface ClientView {
  viewType?: string;
  view(props: {model: OBJIOItem}): JSX.Element;
}

export interface ViewDesc {
  desc: string;
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

export interface ObjTab {
  icon: string;
  title?: string;
  id?: string;
  command?(props: ObjProps): void;
  render?(props: ObjProps): JSX.Element;
}

export interface FSSummary {
  size: number;
  count: number;
}

export class ObjectBase extends OBJIOItem {
  protected name: string;
  protected progress: number = 0;
  protected pChange: Timer;

  protected status: Status = 'ok';
  protected errors = Array<string>();
  protected fs: FileSystemSimple;

  constructor(args?: Partial<ObjectBaseArgs>) {
    super();

    if (args) {
      this.status = args.status || this.status;
      this.progress = args.progress || this.progress;
    }

    this.pChange = new Timer(() => {
      this.holder.save();
      this.holder.delayedNotify();
    });
  }

  getPath(key?: string) {
    if (!this.fs)
      return '';

    return this.fs.getPath(key);
  }

  // sendFile dest parameter
  getFileDropDest(): any {
    return {};
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
    let name = this.name;
    if (!name && this.fs) {
      const f = this.fs.getFileDesc('content');
      if (f)
        name = f.name;
    }

    return name;
  }

  setName(name: string): void {
    if (name == this.name)
      return;

    this.name = name;
    this.holder.save();
    this.holder.delayedNotify();
  }

  getIcon(type?: IconType): string {
    return null;
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
    if (!this.pChange.isRunning())
      this.pChange.run(1000);
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

  renderSelObjProps(props: ObjProps): JSX.Element {
    return null;
  }

  getObjTabs(): Array<ObjTab> {
    return [];
  }

  getFS(): FileSystemSimple {
    return this.fs;
  }

  getFSSummary(): FSSummary {
    const fs = this.getFS();  // can be overriden
    if (!fs)
      return { size: 0, count: 0 };

    return {
      size: fs.getTotalSize(),
      count: fs.getTotalFiles()
    };
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
    errors:   { type: 'json', const: true },
    fs:       { type: 'object', const: true }
  })
}
