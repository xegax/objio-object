import { IModuleDef } from 'objio/server';
import { JSONHandler, JSONWatch } from './json-source';

export interface CPModules {
  'json-source.js': IModuleDef<JSONWatch, JSONHandler>;
}
