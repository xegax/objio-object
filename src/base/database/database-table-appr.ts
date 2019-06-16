import { TableColumn } from './database-table-decl';

type HTMLColor = string;

export interface FontAppr {
  family: string;
  sizePx: number;
  bold: boolean;
  italic: boolean;
  color: HTMLColor;
}

export type TableAppr = Partial<{
  header: Partial<{
    show: boolean;
    height: number;
    border: boolean;
    font: Partial<FontAppr>;
  }>;
  body: Partial<{
    border: boolean;
    font: Partial<FontAppr>;
  }>;
  columns: {[column: string]: Partial<TableColumn>};
}>;

export function makeTableAppr(): TableAppr {
  return {
    header: {
      border: true,
      show: true,
      font: {
        family: 'Tahoma',
        sizePx: 14,
        bold: false,
        italic: false,
        color: '#000000'
      }
    },
    body: {
      border: true,
      font: {
        family: 'Tahoma',
        sizePx: 14,
        bold: false,
        italic: false,
        color: '#000000'
      }
    },
    columns: {}
  };
}
