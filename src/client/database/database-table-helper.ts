import { DatabaseTable } from './database-table';

type SortType = 'name' | 'order' | 'none';

export interface ColumnAccessor {
  getAllColumns(sort: SortType): Array<string>; // all columns including generic
  getColsToReq(sort: SortType): Array<string>;  // has not generic columns 
  getColsToShow(sort: SortType): Array<string>; // has generic columns
}

export function defaultColsAccessor(): ColumnAccessor {
  return {
    getAllColumns: () => [],
    getColsToReq: () => [],
    getColsToShow: () => []
  };
}

const sortByOrder = (table: DatabaseTable, cols: Array<string>) => {
  return cols.sort((a, b) => {
    const ac = table.getColumnProp(a);
    const bc = table.getColumnProp(b);
    if (ac.order == null || bc.order == null)
      return 0;

    return ac.order - bc.order;
  });
}

const sortByName = (table: DatabaseTable, cols: Array<string>) => {
  return cols.sort((a, b) => {
    const ac = table.getColumnProp(a);
    const bc = table.getColumnProp(b);
    return (ac.label || a).localeCompare(bc.label || a);
  });
}

export function rowsColsAccessor(table: DatabaseTable): ColumnAccessor {
  const h: ColumnAccessor = {
    getAllColumns: (sort: SortType) => {
      const appr = table.getAppr();
      const cols = table.getColumns().map(c => c.column);

      // generic columns
      Object.keys(appr.genCols)
      .forEach(genc => {
        cols.push(genc);
      });

      if (sort == 'none')
        return cols;

      return sort == 'order' ? sortByOrder(table, cols) : sortByName(table, cols);
    },
    getColsToReq: (sort: SortType) => {
      const appr = table.getAppr();
      let cols = h.getAllColumns('none');

      // remove hidden columns
      cols = cols.filter(c => {
        return !appr.columns[c] || appr.columns[c].show != false;
      });

      // remove generic columns
      cols = cols.filter(c => {
        return appr.genCols[c] == null;
      });

      // add columns used in generic columns
      Object.keys(appr.genCols)
      .forEach(genc => {
        if (appr.columns[genc] && appr.columns[genc].show == false)
          return;

        appr.genCols[genc].colArr.forEach(c => {
          if (!cols.includes(c))
            cols.push(c);
        });
      });

      if (sort == 'none')
        return cols;

      return sort == 'name' ? sortByName(table, cols) : sortByOrder(table, cols);
    },
    getColsToShow: (sort: SortType) => {
      const appr = table.getAppr();
      let cols = h.getAllColumns('none').filter(c => {
        return !appr.columns[c] || appr.columns[c].show != false;
      });

      if (sort == 'none')
        return cols;

      return sort == 'name' ? sortByName(table, cols) : sortByOrder(table, cols);
    }
  };

  return h;
}

export function cardsColsAccessor(table: DatabaseTable): ColumnAccessor {
  const h = {
    getAllColumns: (sort: SortType) => {
      const appr = table.getAppr();
      const cols = table.getColumns().map(c => c.column);

      // generic columns
      Object.keys(appr.genCols)
      .forEach(genc => {
        cols.push(genc);
      });

      if (sort == 'none')
        return cols;

      return sort == 'order' ? sortByOrder(table, cols) : sortByName(table, cols);
    },
    getColsToReq: (sort: SortType) => {
      const appr = table.getAppr();
      let cols = h.getColsToShow('none');

      // add columns using in generic
      cols.forEach(genc => {
        if (!appr.genCols[genc])
          return;

        appr.genCols[genc].colArr
        .forEach(c => {
          if (!cols.includes(c))
            cols.push(c);
        });
      });

      // remove generic
      cols = cols.filter(c => appr.genCols[c] == null);

      if (sort == 'none')
        return cols;

      return sort == 'name' ? sortByName(table, cols) : sortByOrder(table, cols);
    },
    getColsToShow: (sort: SortType) => {
      const appr = table.getAppr();
      const cols = Array<string>();
      if (appr.cardsView.header && appr.cardsView.header.column)
        cols.push(appr.cardsView.header.column);

      if (appr.cardsView.body && appr.cardsView.body.column)
        cols.push(appr.cardsView.body.column);

      if (appr.cardsView.footer && appr.cardsView.footer.column)
        cols.push(appr.cardsView.footer.column);

      if (sort == 'none')
        return cols;

      return sort == 'name' ? sortByName(table, cols) : sortByOrder(table, cols);
    }
  };

  return h;
}
