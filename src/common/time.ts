export interface Time {
  hour: number;
  minute: number;
  second: number;
}

const SECS_PER_MINUTE = 60;
const SECS_PER_HOUR = SECS_PER_MINUTE * 60;

export function getSeconds(t: Partial<Time>): number {
  return (t.hour || 0) * SECS_PER_HOUR + (t.minute || 0) * SECS_PER_MINUTE + (t.second || 0);
}

// returns a string like "0:0:0"
export function getString(t: Partial<Time>): string {
  if (!t)
    return '';
  return `${t.hour || 0}:${t.minute || 0}:${t.second || 0}`;
}

export function getTimeFromSeconds(secs: number): Time {
  const t: Time = { hour: 0, minute: 0, second: 0 };
  t.hour = Math.floor(secs / SECS_PER_HOUR);
  t.minute = Math.floor((secs - t.hour * SECS_PER_HOUR) / SECS_PER_MINUTE);
  t.second = secs - (t.hour * SECS_PER_HOUR + t.minute * SECS_PER_MINUTE);
  return t;
}

export function parseTime(hmsTime: string): Time {
  const d = (hmsTime || '0:0:0').split(':');
  return {
    hour: +d[0] || 0,
    minute: +d[1] || 0,
    second: +d[2] || 0
  };
}

export function getTimeIntervalString(msTime: number) {
  const t = getTimeFromSeconds(msTime / 1000);
  t.second = Math.round(t.second);

  let arr = Array<string>();
  if (t.hour)
    arr.push(`${t.hour}H`);

  if (t.hour || t.minute)
    arr.push(`${t.minute} m`);

  if (t.second)
    arr.push(`${t.second}s`);
  return arr.join(' ');
}
