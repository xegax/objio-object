export function genUUID() {
  let uuid = new Array<string>();
  for (let n = 0; n < 4; n++) {
    uuid.push(Math.random().toString(36).substr(2));
  }

  return uuid.join('-');
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
    return b + ' Bytes';

  if (b < MB)
    return floor(b / KB) + ' KB';

  if (b < GB)
    return floor(b / MB) + ' MB';

  if (b < TB)
    return floor(b / GB) + ' GB';

  return floor(b / TB) + ' TB';
}
