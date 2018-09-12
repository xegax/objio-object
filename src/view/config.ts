import * as React from 'react';
import { OBJIOItem, OBJIOItemClass } from 'objio';
import { ObjectBase } from '../client/object-base';

export {
  ObjectBase
};

export interface FactoryItem< TProps = {}, TArgs = {}, TObject = OBJIOItem> {
  classObj: OBJIOItemClass;
  viewType?: string;
  view(props: TProps): JSX.Element;
  object(args: TArgs): TObject;
  config?(props: Props): JSX.Element;
  sources?:  Array<OBJIOItemClass>;
}

export interface ClientView {
  viewType?: string;
  view(props: {model: OBJIOItem}): JSX.Element;
}

export interface Props {
  objects(): Array<ObjectBase>;
  source?: ObjectBase;
}

export type ViewDescFlags = 'create-wizard';
export interface ViewDesc {
  desc: string;
  flags: Set<ViewDescFlags> | Array<ViewDescFlags>;
  views: Array<ClientView>;
  config(props: Props): JSX.Element;
  sources: Array<Array<OBJIOItemClass>>;
}

export interface ClientClass {
  getViewDesc?(): Partial<ViewDesc>;
}

export abstract class ConfigBase
  <TObjArgs extends Object = Object, TState extends Object = Object>
  extends React.Component<Partial<Props>, Partial<TState>> {
  protected config: Partial<TObjArgs> = {};
  state: Readonly<Partial<TState>> = {} as TState;

  getConfig(): Partial<TObjArgs> {
    return this.config;
  }

  abstract render();
}
