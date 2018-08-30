import { OBJIOItem, OBJIOItemClass } from 'objio';

export interface Props {
  objects(): Array<OBJIOItem>;
  source?: OBJIOItem;
}

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

export interface ClientClass extends OBJIOItemClass {
  getClientViews(): Array<ClientView>;
  getClientConfig?(props: Props): JSX.Element;
}
