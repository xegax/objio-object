import { ObjectBase } from '../base/object-base';

export interface ObjectToCreate {
  name: string;
  icon?: JSX.Element;
  desc: string;
  create(): ObjectBase;
}

export interface IDArgs {
  id: string;
}

export type StrMap = { [key: string]: string };
