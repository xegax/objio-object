import { ApprObject } from '../../common/appr-map';

export interface DataSourceCol {
  label?: string;
  rename?: string;
  discard?: boolean;
  order?: number;
  dataType?: string;
  type?: 'generic';
  size?: number;
  expression?: string;
}

export type ColumnCfg = {[name: string]: DataSourceCol}
export interface DataSourceProfile {
  columns: ColumnCfg;
  name: string;
}

export function makeDataSourceProfile(): ApprObject<DataSourceProfile> {
  return {
    obj: {
      columns: {},
      name: ''
    },
    version: {}
  };
}
