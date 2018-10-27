import { OBJIOItem, SERIALIZER } from 'objio';

export type Status = 'ok' | 'error' | 'not configured' | 'in progress';

export interface ObjectBaseArgs {
  status: Status;
  progress: number;
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
    if (this.holder.isClient() || this.status == value)
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
    if (this.holder.isClient() || newValue == this.progress)
      return;

    this.progress = newValue;
    this.holder.save();
    this.holder.delayedNotify();
  }

  getProgress(): number {
    return this.progress;
  }

  addError(err: string): void {
    if (this.holder.isClient())
      return;

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

  static TYPE_ID = 'ObjectBase';
  static SERIALIZE: SERIALIZER = () => ({
    name:     { type: 'string' },
    progress: { type: 'number' },
    status:   { type: 'string' },
    errors:   { type: 'json' }
  })
}
