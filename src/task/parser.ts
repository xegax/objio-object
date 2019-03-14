import { Size } from '../common/point';

export interface Context {
  str: string;
  pos: number;
}

export function readSpaces(ctx: Context) {
  const str = ctx.str;
  let pos = ctx.pos;
  while (pos < str.length && str[pos] == ' ') {
    pos++;
  }
  let res = str.substr(ctx.pos, pos - ctx.pos);
  ctx.pos = pos;
  return res;
}

export function readNext(keyword: string, ctx: Context): string {
  let res = ctx.str.substr(ctx.pos, keyword.length);
  if (res != keyword)
    throw `expected "${keyword}"`;
  
  ctx.pos += res.length;
  return res;
}

export function readBracet(ctx: Context, open: string, close: string): string {
  let res = '';
  let pos = ctx.pos;
  let str = ctx.str;
  if (str[pos] != open)
    throw `expected "${open}"`;
  
  while (pos < str.length && str[pos] != close) {
    res += str[pos++];
  }
  
  if (str[pos] != close)
    throw `expected "${close}"`;
  else
    pos++;
  
  ctx.pos = pos;
  return res;
}

export function readUntil(breakChar: string, ctx: Context): string {
  let res = '';
  let pos = ctx.pos;
  let str = ctx.str;

  while (pos < str.length && str[pos] != breakChar) {
    if (str[pos] == '(') {
      ctx.pos = pos;
      res += readBracet(ctx, '(', ')');
      pos = ctx.pos;
    } else if (str[pos] == '[') {
      ctx.pos = pos;
      res += readBracet(ctx, '[', ']');
      pos = ctx.pos;
    } else {
      res += str[pos++];
    }
  }
  
  if (str[pos] == breakChar)
    pos++;
  
  ctx.pos = pos;
  return res;
}

export function readOneOf(keywords: Array<string>, ctx: Context): string {
  for (let n = 0; n < keywords.length; n++) {
    if (ctx.str.substr(ctx.pos, keywords[n].length) == keywords[n]) {
      ctx.pos += keywords[n].length;
      return keywords[n];
    }
  }
  throw `expected one of ${keywords}`;
}

export function readInteger(ctx: Context): string {
  const str = ctx.str;
  let pos = ctx.pos;
  let res = '';
  while (pos < str.length && str.charCodeAt(pos) >= 48 && str.charCodeAt(pos) <= 57) {
    res += str[pos++];
  }
  ctx.pos = pos;
  if (!res.length)
    throw 'expected integer';
  
  return res;
}

export function readNumber(ctx: Context): string {
  const str = ctx.str;
  let pos = ctx.pos;
  let res = '';
  let pt = 0;
  while (pos < str.length && (str.charCodeAt(pos) >= 48 && str.charCodeAt(pos) <= 57 || (str[pos] == '.' && !pt))) {
    if (str[pos] == '.') {
      if (pt)
        throw `double point not expected`;
      else
        pt++;
    }
    res += str[pos++];
  }
  ctx.pos = pos;
  if (!res.length)
    throw 'expected number';
  
  return res;
}

export function readStreamID(ctx: Context): string {
  readNext('#', ctx);
  const vid = readInteger(ctx);
  readNext(':', ctx);
  const aid = readInteger(ctx);
  
  return `#${vid}:${aid}`;
}

export function readSize(ctx: Context): Size {
  readSpaces(ctx);
  const width = +readInteger(ctx);
  readNext('x', ctx);
  const height = +readInteger(ctx);
  readUntil(',', ctx);

  return { width, height };
}

export function readFPS(ctx: Context): number {
  readSpaces(ctx);
  const fps = +readNumber(ctx);
  readUntil(',', ctx);
  return fps;
}