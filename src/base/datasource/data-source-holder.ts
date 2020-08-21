import { SERIALIZER, OBJIOArray } from 'objio';
import { DataSourceBase, ColumnStat } from './data-source';
import { ObjectBase, IconType, ObjProps } from '../object-base';
import { ApprMapBase, ApprMapClientBase } from '../appr-map';
import { DataSourceProfile, makeDataSourceProfile, DataSourceCol } from './data-source-profile';
import { GridRequestor, ViewArgs, RowsArgs, RowsResult, ViewResult, ArrCell } from 'ts-react-ui/grid/grid-requestor-decl';

export interface TableDescArgs {
  profile?: string;
}

export interface TableDescResult {
  viewId?: string;

  cols: Array<string>;
  rows: number;
}

export interface TableRowsArgs {
  profile?: string;
  viewId?: string;

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
  sort?: boolean;
}

export interface RenameColArgs {
  column: string; // original column name
  newName: string;
}

export interface AddGenericArgs {
  column: string;
  cfg?: DataSourceCol;
}

export abstract class DataSourceHolderBase extends ObjectBase implements GridRequestor<ArrCell> {
  static SOURCE_TABLE = 'source';

  protected dataSource: DataSourceBase;
  protected genericCols = new Array<string>();
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

  updateProfile(p: Partial<DataSourceProfile>) {
    this.getProfile().setProps(p);
  }

  getColumns(args?: GetColumnsArgs): Array<{ name: string } & DataSourceCol> {
    args = {
      profile: this.getProfile(),
      filter: true,
      sort: true,
      ...args
    };

    const appr = args.profile.get();
    let cols = (
      this.dataSource.getTotalCols()
      .map(c => {
        return {
          ...appr.columns[c.name],
          name: c.name
        };
      })
    );

    cols.push(
      ...this.genericCols
      .map(name => {
        return {
          ...appr.columns[name],
          name
        };
      })
    );

    if (args.filter)
      cols = cols.filter(c => !c.discard);

    if (args.sort)
      cols = cols.sort((a, b) => a.order - b.order);

    return cols;
  }

  getTotalRows() {
    return this.dataSource.getTotalRows();
  }

  getTotalCols() {
    return this.dataSource.getTotalCols();
  }

  abstract createView(args: ViewArgs): Promise<ViewResult>;
  abstract getRows(args: RowsArgs): Promise<RowsResult<ArrCell>>;
  abstract clearCache(): void;

  abstract getTableDesc(args: TableDescArgs): Promise<TableDescResult>;
  abstract getTableRows(args: TableRowsArgs): Promise<TableRowsResult>;
  abstract renameColumn(args: RenameColArgs): Promise<void>;
  abstract addGenericCol(args: AddGenericArgs): Promise<void>;
  abstract removeGenericCol(name: string): Promise<void>;
  abstract execute(): Promise<void>;

  static TYPE_ID = 'DataSourceHolder';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    dataSource: { type: 'object', const: true },
    profiles: { type: 'object', const: true },
    statMap: { type: 'json', const: true },
    genericCols: { type: 'json', const: true }
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

  getColumnInfo(name: string): DataSourceCol {
    return {
      ...this.getProfile().get().columns[name]
    };
  }

  createView(args: ViewArgs): Promise<ViewResult> {
    return this.holder.invokeMethod({ method: 'createView', args });
  }

  getRows(args: RowsArgs): Promise<RowsResult<ArrCell>> {
    return this.holder.invokeMethod({ method: 'getRows', args });
  }

  clearCache() {
    this.holder.invokeMethod({ method: 'clearCache', args: {} });
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

  addGenericCol(args: AddGenericArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'addGenericCol', args });
  }

  removeGenericCol(name: string) {
    return this.holder.invokeMethod({ method: 'removeGenericCol', args: { name }});
  }

  execute() {
    return this.holder.invokeMethod({ method: 'execute', args: {} });
  }
}
