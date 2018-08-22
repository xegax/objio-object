export interface Time {
  h: number;
  m: number;
  s: number;
}

export function toSeconds(time: Partial<Time>): number {
  return (time.h || 0) * 60 * 60 + (time.m || 0) * 60 + (time.s || 0);
}

export function toString(t: Partial<Time>): string {
  return `${t.h || 0}:${t.m || 0}:${t.s || 0}`;
}

export function parseTime(t: string): Time {
  const d = t.split(':');
  return {
    h: +d[0],
    m: +d[1],
    s: +d[2]
  };
}
