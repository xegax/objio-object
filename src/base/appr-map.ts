import { ApprMap } from '../common/appr-map';

export abstract class ApprMapBase<T> extends ApprMap<T> {
  constructor(schema?: T) {
    super(schema);

    this.holder.addEventHandler({
      onObjChange: () => {
        this.bake = null;
      }
    });
  }

  protected abstract sendPropsImpl(args: Partial<T>): Promise<void>;
  protected abstract resetToDefaultAllImpl(): Promise<void>;
  protected setPropsSuper(args: Partial<T>): void {
    super.setProps(args);
  }

  setProps(args: Partial<T>): Promise<void> {
    return this.sendPropsImpl(args);
  }

  resetToDefaultAll(): Promise<void> {
    return this.resetToDefaultAllImpl();
  }

  resetToDefaultKey<
    K1 extends keyof T,
    K2 extends keyof T[K1],
    K3 extends keyof T[K1][K2],
    K4 extends keyof T[K1][K2][K3],
    K5 extends keyof T[K1][K2][K3][K4]
  >(k1: K1, k2?: K2, k3?: K3, k4?: K4, k5?: K5): boolean {
    let obj: Partial<T> = {};

    let p = this.mods;
    let objp = obj;
    for (let n = 0; n < arguments.length; n++) {
      const key = arguments[n];
      p = p[key];
      if (p === null || p === undefined)
        return false;

      if (n + 1 == arguments.length) {
        objp[key] = null;
      } else {
        objp = (objp[key] = {});
      }
    }

    this.sendPropsImpl(obj);
    return true;
  }
}

export class ApprMapClientBase<T> extends ApprMapBase<T> {
  protected sendPropsImpl(args: Partial<T>): Promise<void> {
    return this.holder.invokeMethod({ method: 'sendPropsImpl', args });
  }

  protected resetToDefaultAllImpl(): Promise<void> {
    return this.holder.invokeMethod({ method: 'resetToDefaultAllImpl', args: {} });
  }
}

export class ApprMapServerBase<T> extends ApprMapBase<T> {
  constructor(schema?: T) {
    super(schema);

    this.holder.setMethodsToInvoke({
      sendPropsImpl: {
        method: (args: Partial<T>) => this.sendPropsImpl(args),
        rights: 'write'
      },
      resetToDefaultAllImpl: {
        method: () => this.resetToDefaultAllImpl(),
        rights: 'write'
      }
    });
  }

  protected resetToDefaultAllImpl(): Promise<void> {
    super.resetToDefaultAll();
    this.holder.save(true);
    return Promise.resolve();
  }

  protected sendPropsImpl(args: Partial<T>): Promise<void> {
    this.setPropsSuper(args);
    this.holder.save(true);
    return Promise.resolve();
  }
}
