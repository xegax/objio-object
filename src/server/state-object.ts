import { OBJIOItem, SERIALIZER } from 'objio';

export type StateType = 'not configured' | 'valid' | 'in progress' | 'error';

export class StateObject extends OBJIOItem {
  protected progressMsg: string = '';
  protected progress: number = 0;
  protected state: StateType = 'not configured';
  protected errors: Array<string> = [];

  isValid(): boolean {
    return this.state == 'valid';
  }

  getType(): StateType {
    return this.state;
  }

  getProgress(): number {
    return this.progress;
  }

  getProgressMsg(): string {
    return this.progressMsg;
  }

  setProgress(p: number): void {
    let newProgress = Math.round(p * 100) / 100;

    if (newProgress != this.progress)
      this.holder.save();

    this.progress = newProgress;
  }

  setProgressMsg(msg: string): StateObject {
    this.progressMsg = msg;
    return this;
  }

  setStateType(type: StateType): StateObject {
    if (this.state != type && type != 'error')
      this.errors = [];

    this.state = type;
    return this;
  }

  addError(err: string): StateObject {
    this.state = 'error';
    this.errors.push(err);
    return this;
  }

  save(): void {
    this.holder.save();
  }

  static TYPE_ID = 'StateObject';
  static SERIALIZE: SERIALIZER = () => ({
    'progressMsg':  { type: 'string'  },
    'progress':     { type: 'number'  },
    'state':        { type: 'string'  },
    'errors':       { type: 'json'    }
  })
}
