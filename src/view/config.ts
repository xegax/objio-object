import * as React from 'react';
import { OBJIOItemClass } from 'objio';
import { ObjectBase, ClientView, ViewDesc } from '../base/object-base';
import { FactoryItem, ConfigProps, Flag } from '../common/view-factory';

export {
  ObjectBase,
  FactoryItem,
  ConfigProps,
  Flag,
  ClientView,
  ViewDesc
};

export interface OBJIOItemClassViewable extends OBJIOItemClass {
  getViewDesc?(): Partial<ViewDesc>;
}

export interface RegisterArgs extends Partial<ViewDesc> {
  classObj: OBJIOItemClass;
}

export function registerViews(args: RegisterArgs) {
  const cc = args.classObj as OBJIOItemClassViewable;
  const flags = Array.isArray(args.flags || []) ? new Set(args.flags) : args.flags;
  cc.getViewDesc = (): ViewDesc => {
    return {
      flags,
      desc: args.desc || args.classObj.TYPE_ID,
      views: args.views,
      config: args.config,
      sources: args.sources
    };
  };
}

export abstract class ConfigBase
  <TObjArgs extends Object = Object, TState extends Object = Object>
  extends React.Component<Partial<ConfigProps>, Partial<TState>> {
  protected config: Partial<TObjArgs> = {};
  state: Readonly<Partial<TState>> = {} as TState;

  getConfig(): Partial<TObjArgs> {
    return this.config;
  }

  abstract render();
}
