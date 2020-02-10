import * as React from 'react';
import {
  DataSourceHolderClientBase,
  TableDescResult,
  DataSourceHolderArgs
} from '../../base/datasource/data-source-holder';
import { ObjTab, ObjProps, IconType } from '../../base/object-base';
import { GridLoadableModel } from 'ts-react-ui/grid/grid-loadable-model';
import { PropItem } from 'ts-react-ui/prop-sheet/prop-item';

export class DataSourceHolder extends DataSourceHolderClientBase {
  private grid: GridLoadableModel;
  private tableDesc: TableDescResult;

  constructor(args?: DataSourceHolderArgs) {
    super(args);

    const onInit = () => {
      this.updateGrid();

      this.dataSource.holder.addEventHandler({
        onObjChange: () => {
          this.updateGrid();
        }
      });

      return Promise.resolve();
    };

    this.holder.addEventHandler({
      onLoad: onInit,
      onCreate: onInit
    });
  }

  private updateGrid() {
    this.dataSource.getTableDesc({})
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
      this.dataSource.getTableRows({ startRow: from, rowsCount: count })
      .then(res => {
        return res.rows.map(cell => {
          return { cell };
        });
      })
    );
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

    return this.dataSource.getObjTabs();
  }

  getObjPropGroups(props: ObjProps) {
    if (!this.dataSource)
      return null;

    return this.dataSource.getObjPropGroups(props);
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
