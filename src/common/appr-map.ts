import { OBJIOItem, SERIALIZER } from 'objio';

export interface ApprMapIface<T> {
  setProps(props: Partial<T>): void;
  resetToDefault(): void;
  get(): T;
}

export class ApprMap<T = Object> extends OBJIOItem implements ApprMapIface<T> {
  protected schema: T = {} as T;
  protected mods: Partial<T> = {};  // modifications of schema
  protected bake: T = null;         // schema + modifications = bake

  constructor(schema: T) {
    super();
    this.schema = schema;
  }

  private makeBake(): T {
    const bake = deepCopy<T>(this.schema);
    copyKeys(bake, this.mods);
    return bake;
  }

  setProps(props: Partial<T>): void {
    copyKeys(this.mods, props);
    this.bake = null;
  }

  resetToDefault() {
    this.mods = {};
    this.bake = null;
  }

  get(): T {
    if (!this.bake)
      this.bake = this.makeBake();

    return this.bake;
  }

  isModified<
    K1 extends keyof T,
    K2 extends keyof T[K1],
    K3 extends keyof T[K1][K2],
    K4 extends keyof T[K1][K2][K3],
    K5 extends keyof T[K1][K2][K3][K4],
    K6 extends keyof T[K1][K2][K3][K4][K5]
  >(k1: K1, k2?: K2, k3?: K3, k4?: K4, k5?: K5): boolean {
    let p = this.mods;
    for (let n = 0; n < arguments.length; n++) {
      p = p[arguments[n]];
      if (p === null || p === undefined)
        return false;
    }

    return p !== null && p !== undefined;
  }

  setSchema(schema: T): void {
    this.schema = schema;
    this.bake = null;
  }

  static TYPE_ID = 'ApprMap';
  static SERIALIZE: SERIALIZER = () => ({
    schema: { type: 'json', const: true },
    mods: { type: 'json', const: true }
  })
}

function copyKeys(dst: Object, src: Object, p?: Array<string>) {
  p = p || [];
  Object.keys(src)
  .forEach(k => {
    const arr = [...p, k];
    if (typeof src[k] == 'object' && src[k] !== null) {
      let dst2 = dst[k] || (dst[k] = {});
      copyKeys(dst2, src[k], arr);
    } else {
      /*if (typeof dst[k] == 'object' && dst[k] !== null)
        console.log(`"${arr.join('/')}" object can not be replaced by this type`);
      else {*/
        dst[k] = src[k];
        if (dst[k] === null || dst[k] === undefined)
          delete dst[k];
      //}
    }
  });
}

function deepCopy<T = Object>(src: Object, dst?: T): T {
  dst = dst || {} as T;
  for (let k in src) {
    const srcValue = src[k];
    // array, object
    if (srcValue !== null && typeof srcValue == 'object') {
      dst[k] = Array.isArray(srcValue) ? [] : {};
      deepCopy(srcValue, dst[k]);
    } else {
      dst[k] = srcValue;
    }
  }
  return dst;
}
