export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {
}

export interface CSSRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function cssRectToRect(rect: CSSRect): Rect {
  return {
    x: Math.min(rect.left, rect.right),
    y: Math.min(rect.top, rect.bottom),
    width: Math.abs(rect.right - rect.left),
    height: Math.abs(rect.bottom - rect.top)
  };
}

export function rectToCSSRect(rect: Rect): CSSRect {
  return {
    left: rect.x,
    top: rect.y,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height
  };
}

export function inRect(rect: Rect, point: Point): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}
