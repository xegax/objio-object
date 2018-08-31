import * as React from 'react';
import { OBJIOItem, OBJIOItemClass } from 'objio';

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
  objects(): Array<OBJIOItem>;
  source?: OBJIOItem;
}

export interface ClientClass {
  getClientViews?(): Array<ClientView>;
  getClientConfig?(props: Props): JSX.Element;
  getClassSources?(): Array<OBJIOItemClass>;
}

export abstract class ConfigBase<TObjArgs extends Object = Object> extends React.Component<Partial<Props>> {
  protected config: Partial<TObjArgs> = {};

  getConfig(): Partial<TObjArgs> {
    return this.config;
  }

  abstract render();
}
