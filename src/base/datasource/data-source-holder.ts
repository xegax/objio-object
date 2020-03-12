import { SERIALIZER, OBJIOArray } from 'objio';
import { DataSourceBase } from './data-source';
import { ObjectBase, IconType, ObjProps } from '../object-base';
import { ApprMapBase, ApprMapClientBase } from '../appr-map';
import { DataSourceProfile, makeDataSourceProfile, DataSourceCol } from './data-source-profile';

export interface ColumnStat {
  empty: number;          // size == 0
  count: number;
  strMinMax: number[];    // > 0
  strCount: number;
  intCount: number;     
  doubleCount: number;  
  numMinMax: number[];
}

export interface TableDescArgs {
  profile?: string;
}

export interface TableDescResult {
  cols: Array<string>;
  rows: number;
}

export interface TableRowsArgs {
  profile?: string;

  startRow: number;
  rowsCount: number;
}

export interface TableRowsResult {
  startRow: number;
  rows: Array< Array<string | number> >;
}

export interface GetColumnsArgs {
  profile?: ApprMapBase<DataSourceProfile>;
  filter?: boolean;
}

export interface RenameColArgs {
  column: string; // original column name
  newName: string;
}

export abstract class DataSourceHolderBase extends ObjectBase {
  protected dataSource: DataSourceBase;
  protected statMap: {[col: string]: ColumnStat} = {};
  protected profiles: OBJIOArray<ApprMapBase<DataSourceProfile>>;
  private currProfileId: string;

  getIcon(type: IconType) {
    return this.dataSource.getIcon(type);
  }

  getStatus() {
    return this.dataSource.getStatus();
  }

  getProgress() {
    return this.dataSource.getProgress();
  }

  isStatusInProgess() {
    return this.dataSource.isStatusInProgess();
  }

  renderSelObjProps(props: ObjProps) {
    return this.dataSource.renderSelObjProps(props);
  }

  getProfile(): ApprMapBase<DataSourceProfile> {
    const idx = this.profiles.find(p => p.holder.getID() == this.currProfileId);
    return this.profiles.get(idx == -1 ? 0 : idx);
  }

  getColumns(args?: GetColumnsArgs): Array<{ name: string } & DataSourceCol> {
    args = {
      profile: this.getProfile(),
      filter: true,
      ...args
    };

    const appr = args.profile.get();
    return (
      this.dataSource.getTotalCols()
      .map(c => {
        return {
          ...appr.columns[c.name],
          name: c.name
        };
      })
      .filter(c => args.filter ? !c.discard : true)
      .sort((a, b) => a.order - b.order)
    );
  }

  getTotalRows() {
    return this.dataSource.getTotalRows();
  }

  getTotalCols() {
    return this.dataSource.getTotalCols();
  }

  abstract getTableDesc(args: TableDescArgs): Promise<TableDescResult>;
  abstract getTableRows(args: TableRowsArgs): Promise<TableRowsResult>;
  abstract renameColumn(args: RenameColArgs): Promise<void>;

  static TYPE_ID = 'DataSourceHolder';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    dataSource: { type: 'object', const: true },
    profiles: { type: 'object', const: true },
    statMap: { type: 'json', const: true }
  })
}

export interface DataSourceHolderArgs {
  dataSource: DataSourceBase;
}

export class DataSourceHolderClientBase extends DataSourceHolderBase {
  constructor(args?: DataSourceHolderArgs) {
    super();

    if (!args)
      return;

    this.dataSource = args.dataSource;
    this.profiles = new OBJIOArray([
      new ApprMapClientBase<DataSourceProfile>(makeDataSourceProfile())
    ]);
  }

  getFS() {
    if (!this.dataSource)
      return null;

    return this.dataSource.getFS();
  }

  updateProfile(p: Partial<DataSourceProfile>) {
    this.getProfile().setProps(p);
  }

  getColumnInfo(name: string): DataSourceCol {
    return {
      ...this.getProfile().get().columns[name]
    };
  }

  getTableDesc(args: TableDescArgs): Promise<TableDescResult> {
    return this.holder.invokeMethod({ method: 'getTableDesc', args });
  }

  getTableRows(args: TableRowsArgs): Promise<TableRowsResult> {
    return this.holder.invokeMethod({ method: 'getTableRows', args });
  }

  renameColumn(args: RenameColArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'renameColumn', args });
  }
}
