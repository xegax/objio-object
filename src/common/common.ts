export function genUUID() {
  let uuid = new Array<string>();
  for (let n = 0; n < 4; n++) {
    uuid.push(Math.random().toString(36).substr(2));
  }

  return uuid.join('-');
}

export function getExt(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  if (i == -1)
    return '';
  return fileName.substring(i);
}

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;
const TB = GB * 1024;

function fmtBytes(b: number): string {
  if (b < KB)
    return '' + b;

  if (b < MB)
    return Math.floor(b / KB) + 'K';

  if (b < GB)
    return Math.floor(b / MB) + 'M';

  if (b < TB)
    return Math.floor(b / GB) + 'G';

  return Math.floor(b / TB) + 'T';
}
