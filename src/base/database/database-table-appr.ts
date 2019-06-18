import { FontAppr } from '../appr-decl';

export interface TableColumnAppr {
  column: string;
  label?: string;
  size?: number;
  show?: boolean;
  order?: number;
  font?: FontAppr;
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
