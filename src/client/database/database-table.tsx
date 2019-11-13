import * as React from 'react';
import {
  DatabaseTableClientBase,
  ObjProps
} from '../../base/database/database-table';
import {
  PropsGroup,
  DropDownPropItem,
  PropItem,
  SwitchPropItem
} from 'ts-react-ui/prop-sheet';
import { DatabaseHolder } from './database-holder';
import { LoadTableGuidResult } from '../../base/database/database-holder-decl';
import { DatabaseHolderBase } from '../../base/database/database-holder';
import { TableDesc, ColOrder, CompoundCond, ColumnInfo } from '../../base/database/database-decl';
import { TableAppr, TableColumnAppr } from '../../base/database/database-table-appr';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { CSSIcon } from 'ts-react-ui/cssicon';
import { GridLoadableModel } from 'ts-react-ui/grid/grid-loadable-model';
import { ObjLink } from '../../control/obj-link';
import { ForwardProps } from 'ts-react-ui/forward-props';
import { ListView, Item } from 'ts-react-ui/list-view';
import { FitToParent } from 'ts-react-ui/fittoparent';
import { Popover } from 'ts-react-ui/popover';
import { FontPanel, FontValue } from '../../control/font-panel';
import { FontAppr } from '../../base/appr-decl';
import { ContextMenu, Menu, MenuItem } from 'ts-react-ui/blueprint';
import { prompt } from 'ts-react-ui/prompt';
import { FilterPanel, FilterPanelView } from 'ts-react-ui/panel/filter-panel';
import {
  DBColType,
  ColItem,
  getCatFilter,
  FilterHolder,
  getRangeFilter,
  SortType,
  getTextFilter
} from 'ts-react-ui/panel/filter-panel-decl';
import { ValueCond, RangeCond } from '../../base/database/database-decl';
import { ObjTab } from '../../base/object-base';
import { KeyValue } from '../../common/interfaces';
import { selectCategory } from 'ts-react-ui/panel/select-category';

function conv2DBColType(type: string): DBColType {
  type = type.toLowerCase();
  if (type.startsWith('varchar'))
    return 'varchar';
  if (type == 'integer' || type.startsWith('int'))
    return 'integer';
  if (type == 'real' || type == 'double')
    return 'real';
  if (type == 'text' || type == 'longtext')
    return 'text';
  throw 'unknown type';
}

function getSortOrder(column: string, sort: SortType): Array<ColOrder> | undefined {
  if (sort == 'value')
    return [{ column }];

  if (sort == 'count')
    return [{ column: `${column}_count` }];
}

let defaultFont: FontAppr = {
  color: '#000000',
  align: 'center',
  family: 'Segoe UI',
  sizePx: 14
};

function makeCond(filters: Array<FilterHolder>, inverse: boolean): CompoundCond {
  let cf: CompoundCond = { op: 'and', values: [] };

  for (let h of filters) {
    const cat = getCatFilter(h.filter);
    if (cat && cat.values.length) {
      let cats: CompoundCond = { op: 'or', values: [] as Array<ValueCond> };

      for (let v of cat.values)
        cats.values.push({ column: h.column.name, value: v, inverse });

      if (cats.values.length == 1)
        cf.values.push(cats.values[0]);
      else if (cats.values.length > 1)
        cf.values.push(cats);

      continue;
    }

    const range = getRangeFilter(h.filter);
    if (range && (range.range[0] != null || range.range[1] != null)) {
      let cond: RangeCond = {
        column: h.column.name,
        range: range.rangeFull
      };
      cf.values.push(cond);
      continue;
    }

    const text = getTextFilter(h.filter);
    if (text && text.filterText) {
      const words = text.filterText.split(' ');
      if (words.length == 1) {
        cf.values.push({
          column: h.column.name,
          value: text.filterText,
          like: true,
          inverse
        } as ValueCond);
      } else {
        const comp: CompoundCond = {
          op: 'or',
          values: words.map(w => ({
            column: h.column.name,
            value: w,
            like: true,
            inverse
          }))
        };
        cf.values.push(comp);
      }
    }
  }

  if (cf.values.length == 0)
    return null;

  return cf;
}

export type SelectionData = Array<KeyValue>;

export class DatabaseTable extends DatabaseTableClientBase {
  private grid: GridLoadableModel;
  private prevDB: DatabaseHolderBase;
  private tables = Array<string>();
  private tableDesc: TableDesc;
  private guid: string;
  private selectionGuid: string;
  private modifiedCols: {[col: string]: Partial<TableColumnAppr>} = {};
  private filter = new FilterPanel([]);
  private filterExpr: CompoundCond;
  private selection: SelectionData;
  private pSelection: Promise<void>;

  private dbChangeHandler = {
    onObjChange: () => {
      this.updateDatabaseData();
      this.grid && this.grid.reloadCurrent();
    }
  };

  private apprHandler = {
    onObjChange: () => {
      this.onApprChanged();
    }
  };

  constructor() {
    super();

    this.holder.addEventHandler({
      onCreate: () => {
        this.listenToAppr();
        this.onApprChanged();
        return Promise.resolve();
      },
      onLoad: () => {
        this.listenToAppr();
        this.onChangeOrLoad();
        this.updateDatabaseData();
        this.onApprChanged();
        return Promise.resolve();
      },
      onObjChange: this.onChangeOrLoad
    });

    this.filter.subscribe(() => {
      const filters = this.filter.getFiltersArr('include');
      this.filterExpr = makeCond(filters, false);
      this.updateSelectionData(true);

      this.loadTableDataImpl();
    }, 'change-filter-values');
  }

  private listenToAppr() {
    if (!this.appr)
      return;

    this.appr.holder.addEventHandler(this.apprHandler);
  }

  private itemFromColumnInfo = (c: ColumnInfo): Item => {
    const p = this.getColumnProp(c.colName);
    return { value: c.colName, render: p.label };
  }

  private itemFromColumn = (value: string): Item => {
    const p = this.getColumnProp(value);
    return { value, render: p.label };
  }

  private prevSelCols: string;
  private prevColsToShow = Array<string>();
  private prevSortCols = Array<{ column: string; revers?: boolean }>();
  private onApprChanged() {
    if (!this.grid || !this.appr)
      return null;

    const appr = this.appr.get();
    this.grid.setHeader(appr.header.show);
    this.grid.setBodyBorder(appr.body.border);

    if (this.tableDesc && this.tableDesc.columns) {
      const sizes = this.tableDesc.columns.map((c, i) => {
        const col = appr.columns[c.colName];
        if (col && col.size != null)
          return { idx: i, size: col.size };

        return null;
      }).filter(p => p);

      sizes.forEach(sz => {
        this.grid.setColSize(sz.idx, sz.size);
      });
    }

    const nextSortCols = appr.sort.order || [];
    const nextColsToShow = this.getColsToShow();
    if (JSON.stringify(this.prevColsToShow) != JSON.stringify(nextColsToShow) ||
      JSON.stringify(this.prevSortCols) != JSON.stringify(nextSortCols)) {
      this.loadTableDataImpl();
    }

    this.prevColsToShow = nextColsToShow;
    this.prevSortCols = nextSortCols;

    let maxFontSizePx: number = appr.body.font.sizePx;
    nextColsToShow.forEach(c => {
      const col = appr.columns[c] || {};
      const font = { ...appr.body.font, ...col.font };
      maxFontSizePx = Math.max(font.sizePx, maxFontSizePx);
    });
    this.grid.setRowSize(maxFontSizePx + 8);
    if (this.grid.setReverse(!!appr.sort.reverse))
      this.prevSelCols = '';

    const newSelCols = JSON.stringify(appr.cols4details);
    if (this.prevSelCols != newSelCols) {
      this.updateSelectionData(true);
    }
    this.prevSelCols = newSelCols;
  }

  getGrid(): GridLoadableModel {
    return this.grid;
  }

  getAppr(): TableAppr {
    if (!this.appr)
      return null;

    return this.appr.get();
  }

  getColumnApprByIdx(col: number): Partial<TableColumnAppr> {
    const appr = this.appr.get();
    const colsMap = appr.columns;
    const cols = this.columns.filter(c => {
      return !colsMap[c.colName] || colsMap[c.colName].show == null || colsMap[c.colName].show;
    })
    .map(c => c.colName)
    .sort((a, b) => {
      const ac = this.getColumnProp(a);
      const bc = this.getColumnProp(b);
      if (ac.order == null || bc.order == null)
        return 0;

      return ac.order - bc.order;
    });

    const colName = cols[col];
    const colAppr = {
      ...appr.columns[colName]
    };

    colAppr.font = {
      ...appr.body.font,
      ...colAppr.font
    };

    return colAppr;
  }

  private applyColsTask: Promise<void>;

  private onApplyColumns() {
    if (this.applyColsTask)
      return;

    this.applyColsTask = this.appr.setProps({ columns: this.modifiedCols })
    .then(() => {
      this.applyColsTask = null;
      this.modifiedCols = {};
    });
  }

  private onChangeOrLoad = () => {
    // database can be changed
    if (this.prevDB)
      this.prevDB.holder.removeEventHandler(this.dbChangeHandler);

    this.prevDB = this.db;
    if (!this.db)
      return Promise.resolve();

    this.db.holder.addEventHandler(this.dbChangeHandler);
    this.loadTableDataImpl();

    try {
      const filterCols = this.columns.map(c => {
        const colp = this.getColumnProp(c.colName);
        const col: ColItem = {
          name: c.colName,
          label: colp.label,
          type: conv2DBColType(c.colType)
        };

        if (col.type == 'varchar' || col.type == 'integer' || col.type == 'real') {
          let sort: SortType;
          col.setFilter = args => {
            let cond = makeCond([
              ...args.filters,
              {
                column: col,
                filter: { filterText: args.filter }
              }
            ], false);

            return (
              this.db.loadTableGuid({
                table: this.tableName,
                distinct: col.name,
                desc: true,
                cond,
                order: getSortOrder(col.name, sort)
              }).then(r => ({ total: r.desc.rowsNum }))
            );
          };
          col.setSort = (sortType: SortType) => {
            sort = sortType;
            return this.db.loadTableGuid({
              table: this.tableName,
              distinct: col.name,
              desc: true,
              order: getSortOrder(col.name, sortType)
            }).then(() => {});
          };
          col.getValues = args => {
            let desc: LoadTableGuidResult = null;
            let p = this.db.loadTableGuid({
              table: this.tableName,
              distinct: col.name,
              desc: true,
              cond: makeCond(args.filters, false),
              order: getSortOrder(col.name, sort)
            })
            .then(r => desc = r)
            .then(desc => this.db.loadTableData({ guid: desc.guid, from: args.from, count: args.count }))
            .then(r => ({
              values: r.rows.map(row => {
                return { value: row[col.name], count: +row[col.name + '_count'] };
              }),
              total: desc.desc.rowsNum
            }));

            return p;
          };
        }
        if (col.type == 'integer' || col.type == 'real') {
          col.getNumRange = args => {
            let p = (this.loadTableTask || Promise.resolve())
            .then(() => this.db.loadTableGuid({
              table: this.tableName,
              cond: makeCond(args.filters, false)
            }))
            .then(r => {
              return this.db.loadAggrData({
                guid: r.guid,
                values: [
                  { column: col.name, aggs: 'min' },
                  { column: col.name, aggs: 'max' }
                ]
              })
              .then(r => {
                return { minMax: [ r.values[0].value, r.values[1].value ] };
              });
            });
            return p;
          };
        }

        return col;
      });

      this.filter.setColumns(filterCols);
    } catch (e) {
      console.error('filter.setColumn fail');
    }

    return Promise.resolve();
  }

  private loadTableTask: Promise<void>;

  getColsToShow(): Array<string> {
    const colMap = this.appr.get().columns;
    const cols = this.columns.filter(c => !colMap[c.colName] || this.getColumnProp(c.colName).show);
    return cols.map(c => c.colName).sort((a, b) => {
      const ac = this.getColumnProp(a);
      const bc = this.getColumnProp(b);
      if (ac.order == null || bc.order == null)
        return 0;

      return ac.order - bc.order;
    });
  }

  private onColResized = () => {
    const colMap = this.appr.get().columns;

    let modified: {[name: string]: Partial<TableColumnAppr>} = {};
    this.getColsToShow().forEach((c, index) => {
      const col = colMap[c] || {};
      const w = this.grid.isColFixed(index) ? this.grid.getColWidth({ index }) : null;
      if (col.size == w)
        return;

      modified[c] = { size: w };
    });

    if (Object.keys(modified).length)
      this.appr.setProps({ columns: modified });
  }

  getSortOrder(): Array<ColOrder> {
    return this.appr.get().sort.order || [];
  }

  private loadTableDataImpl(): Promise<void> {
    if (!this.tableName || this.getStatus() != 'ok')
      return Promise.resolve();

    if (this.loadTableTask)
      return this.loadTableTask;

    const order = this.getSortOrder();
    this.tableDesc = null;
    const columns = this.getColsToShow();
    console.log('loadTableGuid', this.filterExpr);
    this.loadTableTask = this.loadTableGuid({
      table: this.tableName,
      desc: true,
      columns,
      order,
      cond: this.filterExpr
    })
    .then(table => {
      this.loadTableTask = null;

      this.tableDesc = {
        ...table.desc,
        table: this.tableName
      };
      this.guid = table.guid;

      this.grid && this.grid.unsubscribe(this.onColResized, 'col-resized');
      this.grid && this.grid.unsubscribe(this.onSelChanged, 'select');

      this.grid = new GridLoadableModel({
        rowsCount: table.desc.rowsNum,
        colsCount: table.desc.columns.length,
        prev: this.grid
      });
      this.prevSelCols = '';  // need to update selection
      this.onApprChanged();
      this.grid.subscribe(this.onColResized, 'col-resized');
      this.grid.subscribe(this.onSelChanged, 'select');

      this.grid.setLoader((from, count) => {
        return (
          this.loadTableData({ guid: this.guid, from, count })
          .then(res => {
            return res.rows.map(obj => ({ obj }));
          })
        );
      });

      this.holder.delayedNotify();
    })
    .catch(e => {
      this.loadTableTask = null;
      return Promise.reject(e);
    });

    this.updateSelectionData(true);
    return this.loadTableTask;
  }

  private onSelChanged = () => {
    this.updateSelectionData();
  }

  private updateDatabaseData() {
    if (!this.db)
      return;

    this.db.loadTableList()
    .then(lst => {
      this.tables = lst.map(t => t.table);
      this.holder.delayedNotify();
    });
  }

  getTableInfo(): TableDesc {
    if (this.status != 'ok')
      return null;
    return this.tableDesc;
  }

  isTableValid() {
    return this.tableName && this.tableDesc;
  }

  private renderBaseConfig(props: ObjProps) {
    return (
      <PropsGroup label='config' key={'base-' + this.holder.getID()}>
        <DropDownPropItem
          left={[
            <ObjLink
              objId={this.db ? this.db.getID() : null}
              className='fa fa-database'
              title='database'
              style={{ width: '1em', textAlign: 'center' }}
            />
          ]}
          value={this.db ? { value: this.db.getID(), render: this.db.getName() } : null}
          values={props.objects([DatabaseHolder]).map(db => {
            return {
              value: db.getID(),
              render: db.getName()
            };
          })}
          onSelect={db => {
            this.setDatabase({ id: db.value });
          }}
        />
        <DropDownPropItem
          left={[
            <i className='fa fa-table' title='table' style={{ width: '1em', textAlign: 'center' }} />
          ]}
          value={{
            value: this.tableName,
            render: () => {
              if (this.tableName && !this.tableDesc)
                return <span style={{ color: 'red' }}>{this.tableName}</span>;

              return <span>{this.tableName}</span>;
            }
          }}
          values={
            [
              ...[
                {
                  value: null,
                  render: <span style={{ color: 'gray ' }}>not selected</span>
                }
              ],
              ...this.tables.map(value => ({ value }))
            ]
          }
          onSelect={table => {
            this.setTableName({ tableName: table.value });
          }}
        />
      </PropsGroup>
    );
  }

  private onColumnProps(column: string) {
    const c = this.appr.get().columns[column] || {};
    prompt({
      title: 'Column label',
      value: c.label || column
    })
    .then(label => {
      label = label.trim();
      if (label == c.column)
        return;

      this.appr.setProps({ columns: {[column]: { label }} });
    });
  }

  private onColumnCtxMenu(column: string) {
    return (evt: React.MouseEvent) => {
      evt.preventDefault();
      evt.stopPropagation();

      const sort = { order: [], ...this.appr.get().sort };
      const alreadySort = !!sort.order.find(c => c.column == column);
      ContextMenu.show(
        <Menu>
          {!evt.ctrlKey && sort.order.length <= 1 && !alreadySort && <MenuItem
            text={`Sort only by "${column}"`}
            onClick={() => {
              this.appr.setProps({ sort: { order: [{ column }] } });
            }}
          />}
          {evt.ctrlKey && !alreadySort && <MenuItem
            text={`Add sort by "${column}"`}
            onClick={() => {
              if (sort.order.find(c => c.column == column))
                return;

              const order = [...sort.order, { column }];
              this.appr.setProps({ sort: { order } });
            }}
          />}
          {alreadySort && <MenuItem
            text={`Do not sort by "${column}"`}
            onClick={() => {
              const order = sort.order.filter(c => c.column != column);
              this.appr.setProps({ sort: { order } });
            }}
          />}
          <MenuItem
            text='Reset sort'
            onClick={() => {
              this.appr.resetToDefaultKey('sort', 'order');
            }}
          />
        </Menu>,
        { left: evt.pageX, top: evt.pageY }
      );
    };
  };

  private renderColumnItem = (c: Partial<TableColumnAppr>): Item => {
    let mc = {
      font: {},
      ...c,
      ...this.modifiedCols[c.column]
    };

    return {
      value: c.column,
      title: c.label ? `${c.column} (${c.label})` : c.column,
      render: () => {
        return (
          <div
            className='horz-panel-1 flexrow'
            onContextMenu={this.onColumnCtxMenu(c.column)}
          >
            <CheckIcon
              style={{ width: '1em' }}
              showOnHover
              value
              title=''
              faIcon={mc.show ? 'fa fa-check-square-o' : 'fa fa-square-o'}
              onClick={() => {
                const newc = this.modifiedCols[c.column] || (this.modifiedCols[c.column] = { show: c.show });
                newc.show = !newc.show;

                this.holder.delayedNotify();
              }}
            />
            <Popover>
              <CheckIcon
                showOnHover
                value
                faIcon='fa fa-font'
                title={`Font of "${c.column}"`}
              />
              <FontPanel
                font={{...defaultFont, ...c.font}}
                onChange={font => {
                  this.appr.setProps({ columns: {[c.column]: { font }} });
                }}
              />
            </Popover>
            <CheckIcon
              showOnHover
              value
              title={`Properties of "${c.column}"`}
              faIcon='fa fa-cog'
              onClick={() => this.onColumnProps(c.column)}
            />
            <div
              style={{
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                flexGrow: 1,
                color: mc.show ? null : 'silver'
              }}
            >
              {c.column + (c.label ? ` (${c.label})` : '') }
            </div>
            {this.appr.isModified('columns', c.column, 'font') ?
            <CheckIcon
              faIcon='fa fa-refresh'
              title='Reset to default'
              showOnHover
              value
              onClick={() => {
                this.appr.resetToDefaultKey('columns', c.column, 'font');
                this.onApprChanged();
              }}
            /> : null}
          </div>
        );
      }
    };
  }

  getColumnProp(column: string): Partial<TableColumnAppr> {
    const colMap = this.appr.get().columns;
    const tc: TableColumnAppr = {
      column,
      show: true,
      ...colMap[column],
      ...this.modifiedCols[column]
    };
    return tc;
  }

  private renderSort(props: ObjProps) {
    if (!this.appr)
      return null;

    const appr = this.appr.get();
    return (
      <PropsGroup
        label='sort'
        defaultOpen={false}
        key={'sort-' + this.holder.getID()}
      >
        <SwitchPropItem
          label='reverse'
          value={!!appr.sort.reverse}
          onChanged={reverse => {
            this.appr.setProps({ sort: { reverse }});
          }}
        />
      </PropsGroup>
    );
  }

  getColumns() {
    return this.columns || [];
  }

  setSortBy(column: string) {
    if (!this.appr)
      return;

    this.appr.setProps({ sort: { order: [{ column }] } });
  }

  isReverse() {
    if (!this.appr)
      return false;

    return !!this.appr.get().sort.reverse;
  }

  setReverse(reverse: boolean) {
    if (!this.appr)
      return;

    this.appr.setProps({ sort: { reverse }});
  }

  private renderAppr(props: ObjProps) {
    if (!this.appr)
      return null;

    const appr = this.appr.get();
    return (
      <PropsGroup
        label='appearance'
        defaultOpen={false}
        key={'appr-' + this.holder.getID()}
      >
        <PropItem label='font'>
          <div className='horz-panel-1'>
            <Popover>
              <FontValue
                {...defaultFont}
                {...appr.body.font}
              />
              <FontPanel
                font={{...defaultFont, ...appr.body.font}}
                onChange={font => {
                  this.appr.setProps({ body: { font } });
                }}
              />
            </Popover>
            {this.appr.isModified('body', 'font') ? 
            <CheckIcon
              value
              faIcon='fa fa-refresh'
              onClick={() => {
                this.appr.resetToDefaultKey('body', 'font');
                this.onApprChanged();
              }}
            /> : null}
          </div>
        </PropItem>
        <SwitchPropItem
          label='header'
          value={this.appr.get().header.show}
          onChanged={show => {
            this.appr.setProps({ header: { show }});
          }}
        />
        <SwitchPropItem
          label='border'
          value={this.appr.get().body.border}
          onChanged={border => {
            this.appr.setProps({ body: { border }});
          }}
        />
      </PropsGroup>
    );
  }

  private renderColumnsConfig(props: ObjProps) {
    return (
      <PropsGroup
        label='Columns'
        defaultOpen={false}
        defaultHeight={200}
        key={'cols-' + this.holder.getID()}
      >
        <ForwardProps render={(p: { height?: number }) =>
          <div className='vert-panel-1 flexcol flexgrow1' style={{ height: p.height }}>
            {this.renderColumnsView(props)}
          </div>
        }/>
      </PropsGroup>
    );
  }

  private renderColumnsView(props: ObjProps) {
    let cols = this.columns;
    if (!cols.length) {
      return (
        <div>nothing to display</div>
      );
    }

    let apply = (
      <>
        <CheckIcon
          title='apply'
          style={{ color: 'green' }}
          faIcon='fa fa-check-circle'
          value
        />
        <span>Apply</span>
      </>
    );

    if (Object.keys(this.modifiedCols).length) {
      apply = (
        <a className='horz-panel-1' onClick={() => this.onApplyColumns()}>
          {apply}
        </a>
      );
    } else {
      apply = <span className='horz-panel-1' style={{ color: 'silver' }}>{apply}</span>;
    }

    const colProps = cols.map(c => this.getColumnProp(c.colName));
    colProps.sort((a, b) => {
      if (a.order != null && b.order == null)
        return -1;
      if (a.order == null && b.order != null)
        return 1;
      if (a.order == null && b.order == null)
        return 0;

      return a.order - b.order;
    });

    return (
      <>
        <FitToParent wrapToFlex
          render={(w, h) =>
            <ListView
              height={h}
              border={false}
              onSelect={s => {}}
              onMoveTo={args => {
                const dragColIdx = colProps.findIndex(c => c.column == args.drag[0].value);
                const dragCol = colProps.splice(dragColIdx, 1)[0];

                const beforeColIdx = args.before ? colProps.findIndex(c => c.column == args.before.value) : -1;
                if (beforeColIdx != -1)
                  colProps.splice(beforeColIdx, 1, dragCol, colProps[beforeColIdx]);

                colProps.forEach((c, i) => {
                  const col = this.modifiedCols[c.column] || (this.modifiedCols[c.column] = {});
                  col.order = i;
                });
                this.holder.delayedNotify();
              }}
              values={colProps.map(this.renderColumnItem)}
            />
          }
        />
        <div className='horz-panel-1' style={{ textAlign: 'center', flexGrow: 0 }}>
          {apply}
        </div>
      </>
    );
  }

  renderFilter() {
    return (
      <FilterPanelView
        model={this.filter}
      />
    );
  }

  getObjTabs(): Array<ObjTab> {
    return [
      {
        icon: 'fa fa-filter',
        render: () => this.renderFilter()
      }
    ];
  }

  getSelectionData() {
    return this.selection;
  }

  isSelectionDataEnabled() {
    if (!this.appr)
      return false;

    return this.appr.get().cols4details.length > 0;
  }

  private updateSelectionData(invalide?: boolean) {
    if (!this.isSelectionDataEnabled())
      return;

    if (this.pSelection)
      this.pSelection.cancel();

    if (invalide)
      this.selectionGuid = null;

    let p = Promise.resolve();

    if (!this.selectionGuid) {
      p = p.then(() => this.db.loadTableGuid({
        table: this.tableName,
        columns: this.appr.get().cols4details,
        order: this.getSortOrder(),
        cond: this.filterExpr
      }))
      .then(res => {
        this.selectionGuid = res.guid;
      });
    }

    const select = this.grid ? this.grid.getSelectRows() : [];
    if (select.length) {
      p = p.then(() => {
        let from = select[0];
        if (this.appr.get().sort.reverse)
          from = this.tableDesc.rowsNum - 1 - from;

        this.db.loadTableData({ guid: this.selectionGuid, from, count: 1 })
        .then(res => {
          this.selection = Object.keys(res.rows[0])
          .map(key => {
            return { key, value: res.rows[0][key] };
          });
          this.pSelection = null;
          this.holder.delayedNotify();
        })
        .catch(() => {
          this.selection = [];
          this.pSelection = null;
          this.holder.delayedNotify();
        });
      });
    }

    this.pSelection = p;
    this.holder.delayedNotify();
  }

  renderSelectionConfig(props: ObjProps) {
    if (!this.appr)
      return null;

    const cols4details = this.appr.get().cols4details;
    return (
      <PropsGroup
        label='Selection'
        defaultOpen={false}
        defaultHeight={200}
        icon={
          <CSSIcon
            icon='fa fa-cog'
            showOnHover
            onClick={() => {
              const select = new Set(cols4details);
              const values = this.columns.map(this.itemFromColumnInfo);
              selectCategory({ select, values })
              .then(select => {
                this.appr.setProps({ cols4details: Array.from(select) });
              });
            }}
          />
        }
        key={'sel-' + this.holder.getID()}
      >
        <ListView
          values={cols4details.map(this.itemFromColumn)}
          onMoveTo={args => {
            this.appr.setProps({ cols4details: args.newArr.map(arr => arr.value) });
          }}
        />
      </PropsGroup>
    );
  }

  getObjPropGroups(props: ObjProps) {
    return (
      <>
        {this.renderBaseConfig(props)}
        {this.renderAppr(props)}
        {this.renderColumnsConfig(props)}
        {this.renderSelectionConfig(props)}
        {this.renderSort(props)}
      </>
    );
  }
}
