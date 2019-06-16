export interface TableColumn {
  column: string;
  label?: string;
  size?: number;
  show: boolean;
  order?: number;
}

export interface LoadTableFileArgs {
  id: string;
}

export interface SetTableNameArgs {
  tableName: string;
}
