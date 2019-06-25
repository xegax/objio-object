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
import { DatabaseHolderBase } from '../../base/database/database-holder';
import { TableDesc, ColOrder } from '../../base/database/database-decl';
import { TableAppr, TableColumnAppr } from '../../base/database/database-table-appr';
import { CSVTableFile, JSONTableFile } from '../table-file/index';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { GridLoadableModel } from 'ts-react-ui/grid/grid-loadable-model';
import { ObjLink } from '../../control/obj-link';
import { ForwardProps } from 'ts-react-ui/forward-props';
import { ListView, Item } from 'ts-react-ui/list-view';
import { FitToParent } from 'ts-react-ui/fittoparent';
import { Popover } from 'ts-react-ui/popover';
import { FontPanel, FontValue } from '../../control/font-panel';
import { FontAppr } from '../../base/appr-decl';
import { ContextMenu, Menu, MenuItem } from 'ts-react-ui/blueprint';

let defaultFont: FontAppr = {
  color: '#000000',
  align: 'center',
  family: 'Segoe UI',
  sizePx: 14
};

export class DatabaseTable extends DatabaseTableClientBase {
  private grid: GridLoadableModel;
  private prevDB: DatabaseHolderBase;
  private tables = Array<string>();
  private tableDesc: TableDesc;
  private guid: string;
  private modifiedCols: {[col: string]: Partial<TableColumnAppr>} = {};

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
  }

  private listenToAppr() {
    if (!this.appr)
      return;

    this.appr.holder.addEventHandler(this.apprHandler);
  }

  private prevColsToShow = Array<string>();
  private prevSortCols = Array<{ column: string; revers?: boolean }>();
  private onApprChanged() {
    if (!this.grid)
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
    this.grid.setReverse(!!appr.sort.reverse);
  }

  getGrid(): GridLoadableModel {
    return this.grid;
  }

  getAppr(): TableAppr {
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

  private getSortOrder(): Array<ColOrder> {
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
    this.loadTableTask = this.loadTableGuid({ table: this.tableName, desc: true, columns, order })
    .then(table => {
      this.loadTableTask = null;

      this.tableDesc = {
        ...table.desc,
        table: this.tableName
      };
      this.guid = table.guid;

      this.grid && this.grid.unsubscribe(this.onColResized, 'col-resized');

      this.grid = new GridLoadableModel({
        rowsCount: table.desc.rowsNum,
        colsCount: table.desc.columns.length,
        prev: this.grid
      });
      this.onApprChanged();
      this.grid.subscribe(this.onColResized, 'col-resized');

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

    return this.loadTableTask;
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
        <PropItem
          label='rows'
          value={this.tableDesc ? this.tableDesc.rowsNum : '?'}
        />
        <DropDownPropItem
          right={[
            <CheckIcon
              showOnHover
              faIcon='fa fa-upload'
              value={this.tableFileId != null}
              onClick={() => {
                if (!this.tableFileId)
                  return;

                this.loadTableFile({ id: this.tableFileId });
              }}
            />
          ]}
          label='file'
          value={{ value: this.tableFileId }}
          values={props.objects([CSVTableFile, JSONTableFile]).map(item => {
            return {
              value: item.getID(),
              render: item.getName()
            };
          })}
          onSelect={file => {
            this.setTableFile({ id: file.value });
          }}
        />
      </PropsGroup>
    );
  }

  private onColumnCtxMenu(column: string) {
    return (evt: React.MouseEvent) => {
      evt.preventDefault();
      evt.stopPropagation();

      ContextMenu.show(
        <Menu>
          <MenuItem
            text={`sort by "${column}"`}
            onClick={() => {
              this.appr.setProps({ sort: { order: [{ column }] } });
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
              />
              <FontPanel
                font={{...defaultFont, ...c.font}}
                onChange={font => {
                  this.appr.setProps({ columns: {[c.column]: { font }} });
                }}
              />
            </Popover>
            <div
              style={{
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                flexGrow: 1,
                color: mc.show ? null : 'silver'
              }}
            >
              {c.column}
            </div>
            {this.appr.isModified('columns', c.column, 'font') ? <CheckIcon
              faIcon='fa fa-refresh'
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
            {this.appr.isModified('body', 'font') ? <CheckIcon
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
        label='columns'
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

  getObjPropGroups(props: ObjProps) {
    return (
      <>
        {this.renderBaseConfig(props)}
        {this.renderColumnsConfig(props)}
        {this.renderAppr(props)}
        {this.renderSort(props)}
      </>
    );
  }
}
