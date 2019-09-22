import { FontAppr } from '../appr-decl';

export interface TableColumnAppr {
  column: string;
  label?: string;
  size?: number;
  show?: boolean;
  order?: number;
  font?: FontAppr;
}

export interface TableSortAppr {
  order: Array<{column: string; reverse?: boolean}>;
  reverse: boolean;
}

export type TableAppr = Partial<{
  header: Partial<{
    show: boolean;
    height: number;
    border: boolean;
    font: FontAppr;
  }>;
  body: Partial<{
    border: boolean;
    font: FontAppr;
  }>;
  columns: {[column: string]: Partial<TableColumnAppr>};
  cols4details: Array<string>;
  sort: Partial<TableSortAppr>;
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
    columns: {},
    sort: {},
    cols4details: []
  };
}
