import { compileEval, IEval } from '../../base/datasource/eval';

export interface IModifyRows {
  modify(args: { rows: Array<Object> }): Array<Object>;
}

export function modifyRows(colsCfg: {[col: string]: { expression?: string; }}, genCols: Array<string>): IModifyRows {
  let records = 0;
  let colsEval = new Map<string, IEval>();

  return {
    modify: args => {
      let dstRows = new Array<Object>();

      for (let r = 0; r < args.rows.length; r++) {
        const srcRow = args.rows[r];
        const srcCols = [...Object.keys(srcRow), ...genCols];
        let dstRow = Object.create(null);
        for (let n = 0; n < srcCols.length; n++) {
          const col = srcCols[n];
          const colCfg = colsCfg[col];

          let cEval = colsEval.get(col);
          if (!cEval)
            colsEval.set(col, cEval = compileEval({ expr: {...colCfg}.expression || `$col["${col}"]` }));

          dstRow[col] = cEval.format({ recNo: records + n, row: srcRow });
        }
        dstRows.push(dstRow);
      }
      records += args.rows.length;

      return dstRows;
    }
  };
}
