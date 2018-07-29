import { Table as TableBase, SubtableAttrs } from '../table';

export interface CreateSubtableArgs {
  table: string;
  attrs: SubtableAttrs;
}

export abstract class Table extends TableBase {
  abstract createSubtable(args: CreateSubtableArgs);
}
