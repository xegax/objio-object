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
    'Arial black',
    'Tahoma',
    'Verdana',
    'Segoe UI',
    'Times new Roman'
  ];
}
