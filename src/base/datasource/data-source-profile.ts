import { ApprObject } from '../../common/appr-map';
import { GridViewAppr, GridColumnAppr, getGridViewApprDefault } from 'ts-react-ui/grid/grid-view-appr';

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

export type ColumnCfg = {[name: string]: Partial<DataSourceCol & GridColumnAppr> };
export type DataSourceProfile = Omit<GridViewAppr, 'columns'> & {
  columns: ColumnCfg;
  name: string;
}

export function makeDataSourceProfile(): ApprObject<DataSourceProfile> {
  return {
    obj: {
      ...getGridViewApprDefault(),
      columns: {},
      name: ''
    },
    version: {}
  };
}
