import { Table as TableBase, SubtableAttrs as SubtableAttrsBase, SubtableAttrs } from '../table';

export interface CreateSubtableArgs {
  table: string;
  attrs: SubtableAttrs;
}

export abstract class Table extends TableBase {
  abstract createSubtable(args: CreateSubtableArgs);
}
