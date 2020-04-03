import * as React from 'react';
import {
  DataSourceHolderClientBase,
  TableDescResult,
  DataSourceHolderArgs
} from '../../base/datasource/data-source-holder';
import { ObjTab, ObjProps, IconType } from '../../base/object-base';
import { GridLoadableModel } from 'ts-react-ui/grid/grid-loadable-model';
import { PropItem } from 'ts-react-ui/prop-sheet/prop-item';
import { PropsGroup } from 'ts-react-ui/prop-sheet';
import { ListView, Item } from 'ts-react-ui/list-view2';
import { CSSIcon } from 'ts-react-ui/cssicon';
import { PopoverIcon, Popover, Position } from 'ts-react-ui/popover';
import { Menu, MenuItem } from 'ts-react-ui/blueprint';
import { DataSourceCol } from '../../base/datasource/data-source-profile';
import { exportToDatabase } from './export-to-database';
import { DatabaseHolder } from '../database/database-holder';
import { prepareAll } from '../../common/common';
import { IconMap } from 'ts-react-ui/common/icon-map';
import { columnCfg } from './column-cfg';
import { Tooltip } from 'ts-react-ui/tooltip';

const typeToIcon = {
  VARCHAR: 'string-type',
  TEXT: 'text-type',
  INTEGER: 'integer-type',
  REAL: 'double-type'
};

interface ContextMenuItem {
  label: string;
  disabled?: boolean;
  cmd: () => void;
}

interface ColumnItem extends Item {
  col: DataSourceCol;
}

export class DataSourceHolder extends DataSourceHolderClientBase {
  private grid: GridLoadableModel;
  private tableDesc: TableDescResult;

  constructor(args?: DataSourceHolderArgs) {
    super(args);

    const onInit = () => {
      this.updateGrid();

      this.dataSource.holder.addEventHandler({
        onObjChange: () => {
          if (this.dataSource.isStatusInProgess())
            return;

          this.updateGrid();
        }
      });

      this.getProfile().holder.addEventHandler({
        onObjChange: this.onProfileChanged
      });

      return Promise.resolve();
    };

    this.holder.addEventHandler({
      onLoad: onInit,
      onCreate: onInit
    });
  }

  private onProfileChanged = () => {
    this.updateGrid();
    this.holder.delayedNotify();
  };

  private updateGrid() {
    this.getTableDesc({})
    .then(desc => {
      this.tableDesc = desc;

      this.grid = new GridLoadableModel({
        rowsCount: desc.rows,
        colsCount: desc.cols.length,
        prev: this.grid
      });
      this.grid.setLoader(this.tableLoader);
      this.holder.delayedNotify();
    });
  }

  private tableLoader = (from: number, count: number) => {
    return (
      this.getTableRows({ startRow: from, rowsCount: count })
      .then(res => {
        return res.rows.map(cell => {
          return { cell };
        });
      })
    );
  }

  private exportToDatabase = (objProps: ObjProps) => {
    exportToDatabase({ objProps, src: this })
    .then(cfg => prepareAll<{ tableName: string; replaceExists: boolean; dataSourceId: string; dest: DatabaseHolder }>({
      tableName: cfg.tableName,
      replaceExists: cfg.replaceExists,
      dataSourceId: this.holder.getID(),
      dest: this.holder.getObject(cfg.destId)
    }))
    .then(res => {
      const { dest, ...cfg } = res;
      return dest.importTable(cfg);
    });
  }

  getDesc(): TableDescResult {
    return this.tableDesc;
  }

  getGrid() {
    return this.grid;
  }

  getIcon(type?: IconType) {
    return this.dataSource ? this.dataSource.getIcon(type) : undefined;
  }

  getObjTabs(): Array<ObjTab> {
    if (!this.dataSource)
      return [];

    return [
      ...this.dataSource.getObjTabs(),
      {
        icon: 'fa fa-database',
        title: 'Export to database',
        command: this.exportToDatabase
      }
    ];
  }

  getObjPropGroups(props: ObjProps) {
    if (!this.dataSource)
      return null;

    return (
      <>
        {this.dataSource.getObjPropGroups(props)}
        {this.renderCols(props)}
      </>
    );
  }

  private getContextMenuItems(column: string, p: DataSourceCol): Array<ContextMenuItem> {
    return [
      {
        label: 'Properties',
        cmd: () => {
          columnCfg({ name: column, label: p.label, rename: p.rename, size: p.size })
          .then(cfg => {
            let newP: Partial<DataSourceCol> = {};
            if (p.label != cfg.label)
              newP.label = cfg.label;

            if (p.size != cfg.size)
              newP.size = cfg.size;

            if (Object.keys(newP).length)
              this.updateProfile({ columns: {[column]: newP} });

            if (p.rename != cfg.rename)
              this.renameColumn({ column, newName: cfg.rename });
          });
        }
      }
    ];
  }

  private renderType(name: string, col: DataSourceCol) {
    const menuItems = ['INTEGER', 'VARCHAR', 'REAL', 'TEXT'].map(type => {
      return (
        <MenuItem
          text={type}
          active={(col.type || 'VARCHAR') == type}
          onClick={() => {
            this.updateProfile({ columns: {[name]: { type }} });
          }}
        />
      );
    });

    return (
      <Popover>
        <div style={{ display: 'block', cursor: 'pointer' }}>
          {IconMap.render(typeToIcon[col.type] || 'string-type')}
        </div>
        <Menu>
          {menuItems}
        </Menu>
      </Popover>
    );
  }

  private renderColTooltip(col: string) {
    const stat = this.statMap[col];
    if (!stat)
      return null;

    const info = this.getColumnInfo(col);
    const strings = <div>String count: {stat.strCount}</div>;
    const integers = <div>Integer count: {stat.intCount}</div>;
    const doubles = <div>Double count: {stat.doubleCount}</div>;
    const empty = <div>Empty count: {stat.empty}</div>;
    const numRange = <div>Numeric range: [{stat.numMinMax[0]}; {stat.numMinMax[1]}]</div>;
    const strRange = <div>String range: [{stat.strMinMax[0]}; {stat.strMinMax[1]}]</div>;

    const onlyInt = stat.intCount && stat.intCount + stat.empty == stat.count;
    const onlyDouble = stat.doubleCount && stat.doubleCount + stat.empty == stat.count;
    const onlyNumeric = stat.doubleCount + stat.intCount + stat.empty == stat.count;
    const onlyStr = !stat.intCount && !stat.doubleCount;

    let content: JSX.Element = null;
    if (onlyStr) {
      content = (
        <>
          {strings}
          {strRange}
        </>
      );
    } else if (onlyInt) {
      content = (
        <>
          {integers}
          {numRange}
        </>
      );
    } else if (onlyDouble) {
      content = (
        <>
          {doubles}
          {numRange}
        </>
      );
    } else if (onlyNumeric) {
      content = (
        <>
          {integers}
          {doubles}
          {numRange}
        </>
      );
    } else {
      content = (
        <>
          {!onlyNumeric && stat.strCount ? strings : null}
          {!onlyNumeric && stat.strCount ? <div>String range: [{stat.strMinMax[0]}; {stat.strMinMax[1]}]</div> : null}
          {(stat.intCount || stat.doubleCount) ? <div>Numeric count: {stat.intCount + stat.doubleCount}</div> : null}
          {(stat.intCount || stat.doubleCount) ? numRange : null}
          {stat.intCount ? integers : null}
          {stat.doubleCount ? doubles : null}
        </>
      );
    }

    return (
      <div>
        <div style={{ marginBottom: 5 }}>{info.rename || col}</div>
        {stat.empty ? empty : null}
        {content}
      </div>
    );
  }

  private renderCol = (item: ColumnItem) => {
    const ctxMenu = this.getContextMenuItems(item.value, item.col);
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

    return (
      <div
        style={{ display: 'flex', alignItems: 'center', color: item.col.discard ? 'silver' : undefined }}
        className='horz-panel-1'
      >
        <CSSIcon
          style={{ minWidth: '1em' }}
          displayFlex={false}
          icon={item.col.discard ? 'fa fa-check-square-o' : 'fa fa-square-o'}
          onClick={() => {
            this.updateProfile({ columns: { [item.value]: { discard: !item.col.discard } } });
          }}
        />
        {this.renderType(item.value, item.col)}
        <div
          style={{ flexGrow: 1, overflowX: 'hidden', textOverflow: 'ellipsis' }}
          data-tip
          data-for={item.value}
        >
          {(item.col.rename || item.value) + (item.col.label ? ` (${item.col.label})` : '')}
        </div>
        {this.statMap[item.value] && (
          <Tooltip id={item.value} effect='solid'>
            {this.renderColTooltip(item.value)}
          </Tooltip>
        )}
        {jsxCtx}
      </div>
    );
  }

  private renderCols(props: ObjProps) {
    const cols: Array<ColumnItem> = (
      this.getColumns({ filter: false })
      .map(c => {
        return {
          value: c.name,
          label: c.label,
          col: c,
          render: this.renderCol
        };
      })
    );

    return (
      <PropsGroup
        label='Columns'
        defaultOpen={false}
        height={200}
        flex
      >
        <ListView
          style={{ flexGrow: 1 }}
          values={cols}
          onMoveTo={args => {
            let columns = {};
            args.newArr.forEach((c, order) => {
              columns[c.value] = { order };
            });
            this.updateProfile({ columns });
          }}
        />
      </PropsGroup>
    );
  }

  renderSelObjProps(props: ObjProps) {
    return (
      <>
        <PropItem
          label='Rows count'
          value={this.dataSource.getTotalRows()}
        />
        {super.renderSelObjProps(props)}
      </>
    );
  }
}
