import { OBJIOItem, SERIALIZER } from 'objio';
import { Schema } from 'inspector';

export interface ApprMapIface<T> {
  setProps(props: Partial<T>): void;
  resetToDefaultAll(): void;
  resetToDefaultKey<
    K1 extends keyof T,
    K2 extends keyof T[K1],
    K3 extends keyof T[K1][K2],
    K4 extends keyof T[K1][K2][K3],
    K5 extends keyof T[K1][K2][K3][K4]
  >(k1: K1, k2?: K2, k3?: K3, k4?: K4, k5?: K5): boolean;
  get(): T;
}

export type VersionMap = {
  [key: string]: number;
};

export interface ApprObject<T> {
  obj: T;
  version: VersionMap;
}

export class ApprMap<T = Object> extends OBJIOItem implements ApprMapIface<T> {
  protected schema1: ApprObject<T> = { obj: {} as T, version: {} };
  protected modify1: ApprObject<Partial<T>> = { obj: {}, version: {} };  // modifications of schema
  protected bake: T = null;         // schema + modifications = bake

  constructor(schema?: ApprObject<T>) {
    super();
    this.schema1 = schema || this.schema1;
  }

  private makeBake(): T {
    const bake = deepCopy<T>(this.schema1.obj);
    const isCopyAllowed = (key: string) => {
      return this.modify1.version[key] == this.schema1.version[key];
    };

    copyKeys(bake, this.modify1.obj, isCopyAllowed);
    return bake;
  }

  private updateVersions(obj: Object, path?: string) {
    path = path || '';
    Object.keys(obj).forEach(key => {
      const currPath = path ? path + '/' + key : key;
      if (typeof obj[key] == 'object')
        this.updateVersions(obj[key], currPath);
      if (this.schema1.version[currPath] != null)
        this.modify1.version[currPath] = this.schema1.version[currPath];
    });
  }

  setProps(props: Partial<T>): void {
    copyKeys(this.modify1.obj, props);
    this.updateVersions(props);
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
    K5 extends keyof T[K1][K2][K3][K4]
  >(k1: K1, k2?: K2, k3?: K3, k4?: K4, k5?: K5): boolean {
    let p = this.modify1.obj;
    for (let n = 0; n < arguments.length; n++) {
      p = p[arguments[n]];
      if (p === null || p === undefined)
        return false;
    }

    return p !== null && p !== undefined;
  }

  resetToDefaultKey<
    K1 extends keyof T,
    K2 extends keyof T[K1],
    K3 extends keyof T[K1][K2],
    K4 extends keyof T[K1][K2][K3],
    K5 extends keyof T[K1][K2][K3][K4]
  >(k1: K1, k2?: K2, k3?: K3, k4?: K4, k5?: K5): boolean {
    let p = this.modify1.obj;
    for (let n = 0; n < arguments.length; n++) {
      p = p[arguments[n]];
      if (p === null || p === undefined)
        return false;
    }

    p = null;
    return true;
  }

  resetToDefaultAll() {
    this.modify1.obj = {};
    this.modify1.version = {};
    this.bake = null;
  }

  setSchema(schema: ApprObject<T>): void {
    this.schema1 = schema;
    this.bake = null;
  }

  static TYPE_ID = 'ApprMap';
  static SERIALIZE: SERIALIZER = () => ({
    schema1: { type: 'json', const: true },
    modify1: { type: 'json', const: true }
  })
}

function copyKeys(dst: Object, src: Object, isCopyAllowed?: (key: string) => boolean, path?: string) {
  path = path || '';
  if (Array.isArray(src)) {
    if (!Array.isArray(dst))
      throw `src and dst should be the same type`;

    dst.length = src.length;
    for (let k = 0; k < src.length; k++) {
      if (typeof src[k] == 'object' && src[k] != null)
        dst[k] = JSON.parse(JSON.stringify(src[k]));
      else
        dst[k] = src[k];
    }

    return;
  }

  Object.keys(src)
  .forEach(k => {
    const currPath = path ? path + '/' + k : k;
    if (isCopyAllowed && !isCopyAllowed(currPath))
      return;

    if (typeof src[k] == 'object' && src[k] !== null) {
      let dst2 = dst[k] || (dst[k] = Array.isArray(src[k]) ? [] : {});
      copyKeys(dst2, src[k], isCopyAllowed, currPath);
    } else {
      dst[k] = src[k];
      if (dst[k] === null || dst[k] === undefined)
        delete dst[k];
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

function test() {
  let appr = new ApprMap<Partial<{ body: Partial<{ enable: boolean, font: string }> }>>(
    {
      obj: {
        body: {
          enable: false,
          font: '?'
        }
      },
      version: {
        'body': 1
      }
    }
  );
  appr.setProps({ body: { enable: '34234', font: '!' } as any });
  const bake1 = appr.get();

  appr.setSchema({ obj: { body: { enable: true, font: '#'} }, version: { 'body': 1, 'body/enable': 1 } });
  const bake2 = appr.get();
}
