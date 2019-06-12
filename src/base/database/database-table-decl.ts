export interface TableColumn {
  column: string;
  label?: string;
  show: boolean;
}

export interface LoadTableFileArgs {
  id: string;
}

export interface SetTableNameArgs {
  tableName: string;
}

export interface ModifyColumnArgs {
  [column: string]: Partial<TableColumn>
}
