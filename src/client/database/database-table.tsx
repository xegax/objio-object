import * as React from 'react';
import {
  DatabaseTableClientBase,
  ObjProps
} from '../../base/database/database-table';
import {
  PropsGroup,
  DropDownPropItem,
  PropItem,
  SwitchPropItem,
  TextPropItem,
  DropDownPropItem2
} from 'ts-react-ui/prop-sheet';
import { DatabaseHolder } from './database-holder';
import { LoadTableGuidResult } from '../../base/database/database-holder-decl';
import { DatabaseHolderBase } from '../../base/database/database-holder';
import { TableDesc, ColOrder, CompoundCond, ColumnInfo } from '../../base/database/database-decl';
import { TableAppr, TableColumnAppr, formatRow, TableViewType } from '../../base/database/database-table-appr';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { CSSIcon } from 'ts-react-ui/cssicon';
import { GridLoadableModel } from 'ts-react-ui/grid/grid-loadable-model';
import { ObjLink } from '../../control/obj-link';
import { ForwardProps } from 'ts-react-ui/forward-props';
import { ListView, Item } from 'ts-react-ui/list-view';
import { FitToParent } from 'ts-react-ui/fittoparent';
import { Popover, PopoverIcon, Classes } from 'ts-react-ui/popover';
import { FontPanel, FontValue } from '../../control/font-panel';
import { FontAppr } from '../../base/appr-decl';
import { ContextMenu, Menu, MenuItem } from 'ts-react-ui/blueprint';
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
import { KeyValue, StrMap } from '../../common/interfaces';
import { genericColumn } from './generic-column';
import { SelectString } from 'ts-react-ui/drop-down';
import { showColumnProps } from './column-props';
import { Tabs, Tab } from 'ts-react-ui/tabs';
import {
  defaultColsAccessor,
  rowsColsAccessor,
  cardsColsAccessor
} from './database-table-helper';

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
  private sorting = Array<{ value: string; desc: boolean }>();
  private cols = defaultColsAccessor();

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
      this.updateSelPanelData(true);

      this.loadTableDataImpl();
    }, 'change-filter-values');
  }

  private listenToAppr() {
    this.appr.holder.addEventHandler(this.apprHandler);
  }

  private itemFromColumn = (value: string): Item => {
    const p = this.getColumnProp(value);
    return {
      value,
      render: () => {
        return (
          <div className='horz-panel-2'>
            <CSSIcon
              icon='fa fa-trash'
              showOnHover
              onClick={() => {
                this.appr.setProps({
                  selPanel: {
                    columns: this.appr.get().selPanel.columns.filter(c => c != value)
                  }
                });
              }}
            />
            <span>{p.label || value}</span>
          </div>
        );
      }
    };
  }

  private prevSelCols: string;
  private prevColsToShow = Array<string>();
  private prevSortCols = Array<{ column: string; revers?: boolean }>();
  private prevViewType: string;
  private prevGenCols: string;

  private onApprChanged() {
    if (!this.grid)
      return null;

    const appr = this.appr.get();
    this.grid.setHeader(appr.header.show);
    this.grid.setBodyBorder(appr.body.border);

    if (this.tableDesc && this.prevViewType != appr.viewType) {
      this.prevViewType = appr.viewType;
      if (appr.viewType == 'table')
        this.cols = rowsColsAccessor(this);
      else
        this.cols = cardsColsAccessor(this);
    }

    this.cols.getColsToShow('order')
    .forEach((c, i) => {
      if (!appr.columns[c] || !appr.columns[c].size)
        return this.grid.resetColSize(i);

      this.grid.setColSize(i, appr.columns[c].size);
    });

    const nextSortCols = appr.sort.order || [];
    const nextColsToShow = this.cols.getColsToShow('order');
    const nextGenCols = JSON.stringify(appr.genCols);
    if (JSON.stringify(this.prevColsToShow) != JSON.stringify(nextColsToShow) ||
      JSON.stringify(this.prevSortCols) != JSON.stringify(nextSortCols)) {
      this.loadTableDataImpl();
    } else if (nextGenCols != this.prevGenCols) {
      this.grid.reloadCurrent();
    }

    this.prevGenCols = nextGenCols;
    this.prevColsToShow = nextColsToShow;
    this.prevSortCols = nextSortCols;
    this.sorting = nextSortCols.map(col => ({ value: col.column, desc: !!col.reverse }));

    let maxFontSizePx: number = appr.body.font.sizePx;
    nextColsToShow.forEach(c => {
      const col = appr.columns[c] || {};
      const font = { ...appr.body.font, ...col.font };
      maxFontSizePx = Math.max(font.sizePx, maxFontSizePx);
    });
    this.grid.setRowSize(maxFontSizePx + 8);
    if (this.grid.setReverse(!!appr.sort.reverse))
      this.prevSelCols = '';

    this.grid.setViewType(appr.viewType == 'cards' ? 'cards' : 'rows');
    this.grid.setCardWidth(appr.cardsView.cardWidth);
    this.grid.setCardHeight(appr.cardsView.cardHeight);

    const newSelCols = JSON.stringify(appr.selPanel.columns);
    if (this.prevSelCols != newSelCols) {
      this.updateSelPanelData(true);
    }

    this.prevSelCols = newSelCols;
    this.grid.delayedNotify({ type: 'render' });
  }

  getGrid(): GridLoadableModel {
    return this.grid;
  }

  getSorting() {
    return this.sorting;
  }

  setSorting(sorting: Array<{ value: string; desc: boolean }>) {
    this.appr.setProps({
      sort: {
        order: sorting.map(item => ({ column: item.value, reverse: item.desc }))
      }
    });
  }

  getAppr(): TableAppr {
    return this.appr.get();
  }

  getColumnApprByIdx(col: number): Partial<TableColumnAppr> {
    const appr = this.appr.get();
    const cols = this.cols.getColsToShow('order');

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

  isColumnShow = (col: string) => {
    const appr = this.appr.get();

    /*if (appr.viewType == 'cards' && appr.cardsView) {
      return (
        appr.cardsView.body && col == appr.cardsView.body.column ||
        appr.cardsView.header && col == appr.cardsView.header.column ||
        appr.cardsView.footer && col == appr.cardsView.footer.column
      );
    }*/

    return !appr.columns[col] || this.getColumnProp(col).show;
  }

  getCols() {
    return this.cols;
  }

  private onColResized = () => {
    const colMap = this.appr.get().columns;

    let modified: {[name: string]: Partial<TableColumnAppr>} = {};
    this.cols.getColsToShow('order').forEach((c, index) => {
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
    const columns = this.cols.getColsToReq('name');
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

      const cols = this.cols.getColsToShow('name');
      this.grid = new GridLoadableModel({
        rowsCount: table.desc.rowsNum,
        colsCount: cols.length,
        prev: this.grid
      });
      this.prevSelCols = '';  // need to update selection
      this.onApprChanged();
      this.grid.subscribe(this.onColResized, 'col-resized');
      this.grid.subscribe(this.onSelChanged, 'select');

      this.grid.setLoader((from, count) => {
        return (
          this.loadTableData({ guid: this.guid, from, count })
          .then(res => this.prepareServerRows(from, res.rows))
        );
      });

      this.holder.delayedNotify();
    })
    .catch(e => {
      this.loadTableTask = null;
      return Promise.reject(e);
    });

    this.updateSelPanelData(true);
    return this.loadTableTask;
  }

  private prepareServerRows = (from: number, rows: Array<StrMap>): Array<{ obj: StrMap }> => {
    const cols = this.cols.getColsToShow('order');
    const appr = this.appr.get();
    return rows.map((row, i) => {
      const obj: StrMap = {};
      for (let c = 0; c < cols.length; c++) {
        const col = cols[c];
        if (col in row) {
          obj[col] = row[col];
        } else if (col in appr.genCols) {
          obj[col] =  formatRow(row, appr.genCols[col]);
        } else {
          obj[col] = '';
        }
      }
      return { obj };
    });
  }

  private onSelChanged = () => {
    this.updateSelPanelData();
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
      <PropsGroup label='Config' key={'base-' + this.holder.getID()}>
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
    showColumnProps({
      column,
      label: c.label || column,
      dataType: c.dataType || 'text'
    })
    .then(res => {
      res.label = res.label.trim();
      if (res.label == c.column)
        res.label = null;

      this.appr.setProps({
        columns: {[column]:
          {
            label: res.label,
            dataType: res.dataType
          }
        }
      });
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

  private getColumnMenu(column: string) {
    const appr = this.appr.get();
    let arr = Array<{ label: string; disabled?: boolean; cmd: () => void }>();
    arr.push({
      label: 'Reset',
      disabled: !this.appr.isModified('columns', column, 'font'),
      cmd: () => {
        this.appr.resetToDefaultKey('columns', column, 'font');
        this.onApprChanged();
      }
    });

    if (appr.genCols[column]) {
      arr.push({
        label: 'Edit',
        cmd: () => {
          this.onEditGenericColumn(column);
        }
      });

      arr.push({
        label: 'Delete',
        cmd: () => {
          this.appr.resetToDefaultKey('genCols', column);
          this.onApprChanged();
        }
      });
    }

    return arr;
  }

  private renderColumnItem = (c: Partial<TableColumnAppr>): Item => {
    let mc = {
      font: {},
      ...c,
      ...this.modifiedCols[c.column]
    };

    const ctxMenu = this.getColumnMenu(c.column);
    let jsxCtx: JSX.Element = null;
    if (ctxMenu.length) {
      jsxCtx = (
        <PopoverIcon icon='fa fa-ellipsis-h' showOnHover>
          <Menu>
            {ctxMenu.map((item, i) => {
              return (
                <MenuItem
                  disabled={item.disabled}
                  key={i}
                  text={item.label}
                  onClick={item.cmd}
                />
              );
            })}
          </Menu>
        </PopoverIcon>
      );
    }

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
            {jsxCtx}
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

  getColumns() {
    const appr = this.appr.get();
    return (this.columns || []).map(col => {
      const render = (appr.columns[col.colName] || { label: undefined }).label;
      return { column: col.colName, render };
    });
  }

  setSortBy(column: string) {
    this.appr.setProps({ sort: { order: [{ column }] } });
  }

  isReverse() {
    return !!this.appr.get().sort.reverse;
  }

  setReverse(reverse: boolean) {
    this.appr.setProps({ sort: { reverse }});
  }

  private getCardItemRender(type: 'header' | 'footer' | 'body') {
    return (item: Item) => {
      const font = this.appr.get().cardsView[type].font;
      return (
        <span className='horz-panel-1'>
          <span>{item.render || item.value}</span>
          <span
            className={Classes.POPOVER_DISMISS}
            onClick={e => e.stopPropagation()}
          >
            <Popover>
              <CheckIcon
                showOnHover
                value
                faIcon='fa fa-font'
                title='Font'
              />
              <FontPanel
                font={{...defaultFont, ...font}}
                onChange={font => {
                  this.appr.setProps({ cardsView: {[type]: { font } } });
                }}
              />
            </Popover>
          </span>
        </span>
      );
    }
  }

  private renderAppr(props: ObjProps) {
    const appr = this.appr.get();
    const selPanelCols = appr.selPanel.columns;
    const availableCols = [
      ...this.columns.map(c => c.colName),
      ...Object.keys(appr.genCols)
    ].filter(c => !selPanelCols.includes(c)).sort();

    const previewCols = (
      this.cols.getAllColumns('name')
      .map(value => ({
        value
      }))
    );

    const viewType: Array<{ value: TableViewType, render: string }> = [
      { value: 'table', render: 'Table' },
      { value: 'cards', render: 'Cards' }
    ];

    const selViewType = viewType.find(v => v.value == appr.viewType);
    return (
      <PropsGroup
        label='Appearance'
        defaultOpen={false}
        padding={false}
        key={'appr-' + this.holder.getID()}
      >
        <Tabs defaultSelect='common' background={false}>
          <Tab id='common' icon='fa fa-paint-brush'>
            <DropDownPropItem2
              label='View type'
              value={selViewType}
              values={viewType}
              onSelect={(v: { value: TableViewType }) => {
                this.appr.setProps({ viewType: v.value });
              }}
            />
            <PropItem label='Font'>
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
            {appr.viewType == 'table' &&
            <SwitchPropItem
              label='Header'
              value={appr.header.show}
              onChanged={show => {
                this.appr.setProps({ header: { show }});
              }}
            />}
            <SwitchPropItem
              label='Border'
              value={appr.body.border}
              onChanged={border => {
                this.appr.setProps({ body: { border }});
              }}
            />
            <SwitchPropItem
              label='Selection panel'
              value={appr.selPanel.enable}
              onChanged={enable => {
                this.appr.setProps({ selPanel: { enable } });
              }}
            >
              {appr.selPanel.enable && (
                <SelectString
                  items={availableCols}
                  icon='fa fa-plus'
                  onSelect={col => {
                    this.appr.setProps({ selPanel: { columns: [...appr.selPanel.columns, col] } });
                  }}
                />
              )}
            </SwitchPropItem>
            {appr.selPanel.enable && (
              <div>
                <ListView
                  border
                  height={100}
                  values={selPanelCols.map(this.itemFromColumn)}
                  onMoveTo={args => {
                    this.appr.setProps({ selPanel: { columns: args.newArr.map(arr => arr.value) } });
                  }}
                />
              </div>
            )}
          </Tab>
          <Tab id='card' icon='fa fa-id-card-o' show={appr.viewType == 'cards'}>
            <DropDownPropItem2
              label='Header'
              renderSelect={this.getCardItemRender('header')}
              value={appr.cardsView.header && previewCols.find(c => c.value == appr.cardsView.header.column)}
              values={previewCols}
              onSelect={column => {
                this.appr.setProps({ cardsView: { header: { column: column.value } } });
              }}
            />
            <DropDownPropItem2
              label='Body'
              renderSelect={this.getCardItemRender('body')}
              value={appr.cardsView.body && previewCols.find(c => c.value == appr.cardsView.body.column)}
              values={previewCols}
              onSelect={column => {
                this.appr.setProps({ cardsView: { body: { column: column.value } } });
              }}
            />
            <DropDownPropItem2
              label='Footer'
              renderSelect={this.getCardItemRender('footer')}
              value={appr.cardsView.footer && previewCols.find(c => c.value == appr.cardsView.footer.column)}
              values={previewCols}
              onSelect={column => {
                this.appr.setProps({ cardsView: { footer: { column: column.value } } });
              }}
            />
            <TextPropItem
              label='Width'
              value={appr.cardsView.cardWidth}
              onEnter={w => {
                this.appr.setProps({ cardsView: { cardWidth: +w } });
              }}
            />
            <TextPropItem
              label='Height'
              value={appr.cardsView.cardHeight}
              onEnter={h => {
                this.appr.setProps({ cardsView: { cardHeight: +h } });
              }}
            />
          </Tab>
        </Tabs>
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
    let cols = this.cols.getAllColumns('order');
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

    const colProps = cols.map(c => this.getColumnProp(c));
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
        <div className='horz-panel-2' style={{ textAlign: 'center', flexGrow: 0 }}>
          <span
            className='horz-panel-1'
            style={{ cursor: 'pointer' }}
            onClick={() => this.onEditGenericColumn()}
          >
            <CSSIcon
              icon='fa fa-plus'
              title='Create generic column'
            />
            <span>Column</span>
          </span>
          {apply}
        </div>
      </>
    );
  }

  private onEditGenericColumn = (col?: string) => {
    const appr = this.appr.get();
    const genCol = col && appr.genCols[col];
    const args = genCol ? {
      columnName: col,
      format: genCol.format,
      cols: genCol.colArr.slice(),
      editColumn: false,
      availableCols: this.columns.map(c => c.colName)
    } : {
      columnName: '',
      format: '',
      cols: [],
      editColumn: true,
      availableCols: this.columns.map(c => c.colName)
    };

    for (let n = 0; n < 50; n++) {
      if (!col) {
        args.columnName = `generic-${n}`;
        if (this.columns.find(c => c.colName == args.columnName))
          continue;
      }

      genericColumn(args)
      .then(cfg => {
        if (this.columns.find(c => c.colName == cfg.columnName))
          return this.onEditGenericColumn();

        this.appr.setProps({
          genCols: {
            [cfg.columnName]: {
              format: cfg.format,
              colArr: cfg.cols
            }
          }
        });
      });

      break;
    }
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

  getSelData() {
    return this.selection;
  }

  private updateSelPanelData(invalide?: boolean) {
    const appr = this.appr.get();
    if (!appr.selPanel.enable || !appr.selPanel.columns.length)
      return;

    if (this.pSelection)
      this.pSelection.cancel();

    if (invalide)
      this.selectionGuid = null;

    let p = Promise.resolve();

    if (!this.selectionGuid) {
      const genCols = new Set(Object.keys(appr.genCols));
      const columns = new Set<string>();
      appr.selPanel.columns.forEach(c => {
        if (genCols.has(c)) {
          appr.genCols[c].colArr.forEach(c => columns.add(c));
        } else {
          columns.add(c);
        }
      });
      
      p = p.then(() => this.db.loadTableGuid({
        table: this.tableName,
        columns: Array.from(columns),
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
          const appr = this.appr.get();
          this.selection = appr.selPanel.columns
          .map(key => {
            if (key in appr.genCols) {
              return {
                key,
                value: formatRow(res.rows[0], appr.genCols[key])
              };
            }

            return {
              key,
              value: res.rows[0][key]
            };
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

  getObjPropGroups(props: ObjProps) {
    return (
      <>
        {this.renderBaseConfig(props)}
        {this.renderAppr(props)}
        {this.renderColumnsConfig(props)}
      </>
    );
  }
}
