export type LoadTableFileMethod = 'replace' | 'append' | 'newtable';

export interface LoadTableFileArgs {
  tableFileId: string;
  method: LoadTableFileMethod;
}

export interface SetTableNameArgs {
  tableName: string;
}
