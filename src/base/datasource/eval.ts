import { makeEval } from 'ts-react-ui/common/eval';

export interface IEval {
  format(ctx: IFormatCtx): any;
}

const funcs = {
  'trim': (s: string) => {
    return s == null ? s : s.toString().trim()
  },
  'len': (s: string) => {
    return s == null ? s : s.toString().length
  },
  'lowercase': (s: string) => {
    return s == null ? s : (s.toString()).toLowerCase()
  },
  'uppercase': (s: string) => {
    return s == null ? s : (s.toString()).toLowerCase()
  },
  'round': (v: number) => {
    return v == null ? v : Math.round(v);
  },
  'floor': (v: number) => {
    return v == null ? v : Math.floor(v);
  },
  'random': () => {
    return Math.random()
  }
};

interface IFormatCtx {
  row: Object;
  recNo: number;
}

export function compileEval(args: { expr: string }): IEval {
  const res = makeEval(args.expr);

  const format = (ctx: IFormatCtx) => {
    return res.f(funcs, {
      col: ctx.row,
      recNo: ctx.recNo
    });
  };

  return {
    format
  };
}
