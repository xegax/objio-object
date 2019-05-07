export function genUUID() {
  let uuid = new Array<string>();
  for (let n = 0; n < 4; n++) {
    uuid.push(Math.random().toString(36).substr(2));
  }

  return uuid.join('-');
}

export function getExt(fileName: string, depth: number = 1): string {
  let arr = fileName.split('.').slice(1);
  if (arr.length == 0)
    return '';

  arr = arr.slice(arr.length - depth);
  return '.' + arr.join('.');
}

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;
const TB = GB * 1024;

export function floor(value: number, digitsAfterPoint: number = 2) {
  let s = 1;
  while (digitsAfterPoint--) s *= 10;
  return Math.floor(value * s) / s; 
}

export function fmtBytes(b: number): string {
  if (b < KB)
    return b + ' byte';

  if (b < MB)
    return floor(b / KB) + ' Kb';

  if (b < GB)
    return floor(b / MB) + ' Mb';

  if (b < TB)
    return floor(b / GB) + ' Gb';

  return floor(b / TB) + ' Tb';
}
