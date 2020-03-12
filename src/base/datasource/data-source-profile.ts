import { ApprObject } from '../../common/appr-map';

export interface DataSourceCol {
  label?: string;
  rename?: string;
  discard?: boolean;
  order?: number;
  type?: string;
  size?: number;
}

export interface DataSourceProfile {
  columns: { [name: string]: DataSourceCol };
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
