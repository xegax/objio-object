import * as React from 'react';
import {
  DataSourceHolderClientBase,
  TableDescResult,
  DataSourceHolderArgs
} from '../../base/datasource/data-source-holder';
import { ObjTab, ObjProps, IconType } from '../../base/object-base';
import { PropItem } from 'ts-react-ui/prop-sheet/prop-item';
import { ListView, Item } from 'ts-react-ui/list-view2';
import { CSSIcon } from 'ts-react-ui/cssicon';
import { PopoverIcon, Popover } from 'ts-react-ui/popover';
import { Menu, MenuItem } from 'ts-react-ui/blueprint';
import { DataSourceCol } from '../../base/datasource/data-source-profile';
import { IconMap } from 'ts-react-ui/common/icon-map';
import { columnCfg } from './column-cfg';
import { Tooltip } from 'ts-react-ui/tooltip';
import { Tabs, Tab } from 'ts-react-ui/tabs';
import { prompt } from 'ts-react-ui/prompt';
import { getTimeIntervalString } from '../../common/time';
import { GridViewModel } from 'ts-react-ui/grid/grid-view-model';
import { GridApprTab, GridCardsTab } from 'ts-react-ui/grid/grid-tabs-appr';
import { GridPanelSort } from 'ts-react-ui/grid/grid-panel-sort';
import { PropsGroup } from 'ts-react-ui/prop-sheet';

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
  private grid?: GridViewModel;

  constructor(args?: DataSourceHolderArgs) {
    super(args);

    const onInit = () => {
      this.createGrid();

      this.dataSource.holder.addEventHandler({
        onObjChange: () => {
          if (this.dataSource.isStatusInProgess())
            return;

          this.createGrid();
          this.grid?.reloadCurrent();
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

  private createGrid() {
    if (this.grid || this.dataSource?.getTotalCols().length == 0)
      return;

    this.grid = new GridViewModel();
    this.grid.setRequestor(this);
    this.grid.setAllColumns(this.getColumns({ filter: false }).map(c => c.name));
    this.grid.setApprChange(this.getProfile().get());
  }

  private onProfileChanged = () => {
    this.grid?.setApprChange(this.getProfile().get());
    this.grid?.reloadCurrent({ clearCache: false });
    this.holder.delayedNotify();
  }

  private copyColumn = async (srcCol: string, p: DataSourceCol) => {
    const cols = new Set(this.getColumns().map(c => c.name));
    let newCol: string;
    let tries = 1;
    while (tries < 100) {
      newCol = `${srcCol}_copy`;
      if (tries > 1)
        newCol += '_' + tries;

      if (!cols.has(newCol))
        break;

      tries++;
    }

    while (true) {
      let res: string;
      try {
        res = await prompt({ title: 'Enter new column name', value: newCol });
        if (cols.has(res))
          continue;
      } catch (e) {
        break;  // cancel
      }

      try {
        await this.addGenericCol({
          column: res,
          cfg: {
            type: 'generic',
            expression: `$col[ "${srcCol}" ]`
          }
        });
        break;
      } catch (e) {
      }
    }
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
        icon: this.getStatus() == 'in progress' ? 'fa fa-spinner fa-spin' : 'fa fa-rocket',
        title: 'Update database',
        command: this.updateDatabase
      }
    ];
  }

  private updateDatabase = (objProps: ObjProps) => {
    this.execute();
  }

  getObjPropGroups(props: ObjProps) {
    if (!this.dataSource || !this.grid)
      return null;

    return (
      <>
        <PropsGroup label='Sorting'>
          <GridPanelSort model={this.grid}/>
        </PropsGroup>
        <Tabs defaultSelect='appr' flex key={this.holder.getID()}>
          <Tab id='appr' title='Appearance' icon='fa fa-paint-brush'>
            <GridApprTab
              grid={this.grid}
            />
          </Tab>
          <Tab id='cards' title='Cards' icon='fa fa-id-card-o'>
            <GridCardsTab
              grid={this.grid}
            />
          </Tab>
          {this.dataSource.renderTabs(props)}
          {this.renderCols(props)}
        </Tabs>
        <div style={{ textAlign: 'right' }}>
          <CSSIcon
            icon='fa fa-save'
            onClick={() => {
              const appr = this.grid.getApprRef().getChange();
              
              let columns = appr.columns;
              Object.keys(columns)
              .forEach(c => {
                const col = columns[c];
                if (col.width == null)
                  col.width = null;
              });

              this.updateProfile(appr);
            }}
          />
        </div>
      </>
    );
  }

  private getContextMenuItems(column: string, p: DataSourceCol) {
    let items = [
      {
        label: 'Properties',
        cmd: () => {
          columnCfg({
            name: column,
            label: p.label,
            rename: p.rename,
            size: p.size,
            expression: p.expression
          })
          .then(cfg => {
            let newP: Partial<DataSourceCol> = {};
            if (p.label != cfg.label)
              newP.label = cfg.label;

            if (p.size != cfg.size)
              newP.size = cfg.size;

            if (p.expression != cfg.expression)
              newP.expression = cfg.expression;

            if (Object.keys(newP).length)
              this.updateProfile({ columns: {[column]: newP} });

            if (p.rename != cfg.rename)
              this.renameColumn({ column, newName: cfg.rename });
          });
        }
      }, {
        label: 'Copy',
        cmd: () => {
          this.copyColumn(column, p);
        }
      }, {
        disabled: p.type != 'generic',
        label: 'Delete',
        cmd: () => {
          this.removeGenericCol(column);
        }
      }
    ] as Array<ContextMenuItem>;

    return items;
  }

  private renderType(name: string, col: DataSourceCol) {
    const menuItems = (
      ['INTEGER', 'VARCHAR', 'REAL', 'TEXT']
      .map(dataType => {
        return (
          <MenuItem
            text={dataType}
            active={(col.dataType || 'VARCHAR') == dataType}
            onClick={() => {
              this.updateProfile({ columns: {[name]: { dataType }} });
            }}
          />
        );
      })
    );

    return (
      <Popover>
        <div style={{ display: 'block', cursor: 'pointer' }}>
          {IconMap.render(typeToIcon[col.dataType] || 'string-type')}
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
      .map(col => {
        return {
          value: col.name,
          label: col.label,
          col,
          render: this.renderCol
        };
      })
    );

    return (
      <Tab
        id='columns'
        icon='fa fa-table'
        title='Columns'
      >
        <div className='flexcol1' style={{ position: 'relative' }}>
          <ListView
            className='abs-fit'
            border={false}
            values={cols}
            onMoveTo={args => {
              let columns = {};
              args.newArr.forEach((c, order) => {
                columns[c.value] = { order };
              });
              this.updateProfile({ columns });
            }}
          />
        </div>
      </Tab>
    );
  }

  renderSelObjProps(props: ObjProps) {
    return (
      <>
        <PropItem
          label='Rows count'
          value={this.dataSource.getTotalRows()}
        />
        <PropItem
          label='Execute time'
          value={getTimeIntervalString(this.dataSource.getExecTime())}
        />
        {super.renderSelObjProps(props)}
      </>
    );
  }
}
