import { AlignHorz } from '../common/interfaces';

export type HTMLColor = string;

export type FontAppr = Partial<{
  family: string;
  sizePx: number;
  bold: boolean;
  italic: boolean;
  color: HTMLColor;
  align: AlignHorz;
}>;

export function getFontList(): Array<string> {
  return [
    'Arial',
    'Book Antiqua',
    'Courier New',
    'Georgia',
    'Helvetica',
    'Lucida Console',
    'Lucida Grande',
    'Lucida Sans Unicode',
    'Palatino',
    'Palatino Linotype',
    'Segoe UI',
    'Tahoma',
    'Times New Roman',
    'Trebuchet MS',
    'Verdana'
  ];
}

export function getFontSize() {
  return [ 6, 7, 8, 9, 10, 11, 12, 14, 18, 24, 30 ];
}
