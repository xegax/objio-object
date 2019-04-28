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
