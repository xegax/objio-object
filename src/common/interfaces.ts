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

export interface NameArgs {
  name: string;
}

export interface MinMax {
  min: number;
  max: number;
}

export interface Range {
  from: number;
  count: number;
}

export type StrMap = { [key: string]: string };
