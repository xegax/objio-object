import { ApprMap } from '../common/appr-map';

export abstract class ApprMapBase<T> extends ApprMap<T> {
  constructor(schema: T) {
    super(schema);

    this.holder.addEventHandler({
      onObjChange: () => {
        this.bake = null;
      }
    });
  }

  abstract sendProps(args: Partial<T>): Promise<void>;
}

export class ApprMapClientBase<T> extends ApprMapBase<T> {
  sendProps(args: Partial<T>): Promise<void> {
    return this.holder.invokeMethod({ method: 'sendProps', args });
  }

  setProps(args: Partial<T>): void {
    throw 'call setProps not allowed, use sendProps instead';
  }
}

export class ApprMapServerBase<T> extends ApprMapBase<T> {
  constructor(schema: T) {
    super(schema);

    this.holder.setMethodsToInvoke({
      sendProps: {
        method: (args: Partial<T>) => this.sendProps(args),
        rights: 'write'
      }
    });
  }

  sendProps(args: Partial<T>): Promise<void> {
    super.setProps(args);
    this.holder.save(true);
    return Promise.resolve();
  }
}
