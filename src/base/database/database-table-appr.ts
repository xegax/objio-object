import { FontAppr } from '../appr-decl';
import { ApprObject } from '../../common/appr-map';
import { StrMap } from '../../common/interfaces';

export type DataType = 'image' | 'video' | 'text' | 'link';
export type TableViewType = 'table' | 'cards';

export interface TableColumnAppr {
  column: string;
  label?: string;
  size?: number;
  show?: boolean;
  order?: number;
  font?: FontAppr;
  dataType?: DataType;
}

export interface CardColumn {
  column?: string;
  linkColumn?: string;
  font?: FontAppr;
}

export interface CardViewAppr {
  cardWidth?: number;
  cardHeight?: number;
  border?: boolean;

  header?: CardColumn;
  body?: CardColumn;
  footer?: CardColumn;
}

export interface TableSortAppr {
  order: Array<{column: string; reverse?: boolean}>;
  reverse: boolean;
}

export interface GenericColumnAppr {
  format: string; // %1 %2 %3
  colArr: Array<string>;
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
    oddRow: string;
    evenRow: string;
  }>;
  columns: {[column: string]: Partial<TableColumnAppr>};
  genCols: {[column: string]: GenericColumnAppr};
  selPanel: Partial<{
    enable: boolean;
    columns: Array<string>;
  }>;
  cardsView: Partial<CardViewAppr>;
  sort: Partial<TableSortAppr>;
  viewType: TableViewType;
}>;

export function makeTableAppr(): ApprObject<TableAppr> {
  return {
    obj: {
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
        oddRow: '#f1f3f4',
        font: {
          family: 'Tahoma',
          sizePx: 14,
          bold: false,
          italic: false,
          color: '#000000'
        }
      },
      columns: {},
      genCols: {},
      sort: {},
      selPanel: {
        enable: true,
        columns: []
      },
      cardsView: {
        cardWidth: 200,
        cardHeight: 250
      },
      viewType: 'table'
    },
    version: {
      'selPanel': 1
    }
  };
}


export function formatRow(row: StrMap, appr: GenericColumnAppr): string {
  return appr.format.replace(/(%[1-9])+/g, ss => {
    const col = appr.colArr[parseInt(ss.substr(1)) - 1];
    return col in row ? row[col] : '';
  });
}
