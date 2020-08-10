import * as React from 'react';
import { DataSourceHolder } from '../client/datasource/data-source-holder';
import { GridView, RenderIconArgs } from 'ts-react-ui/grid/grid-view';
import { Popover, Position } from 'ts-react-ui/popover';
import { CSSIcon } from 'ts-react-ui/cssicon';
import { FontPanel, FontAppr } from 'ts-react-ui/font-panel';

interface Props {
  model: DataSourceHolder;
}

export class DatasourceHolderView extends React.Component<Props> {
  private subscriber = () => {
    this.setState({});
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.subscriber);
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.subscriber);
  }

  private renderIcon = (args: RenderIconArgs) => {
    const appr = this.props.model.getGrid().getAppr();
    const col = appr.columns[args.col];
    return (
      <span
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
        }
      }>
        <Popover position={Position.BOTTOM_RIGHT}>
          <CSSIcon
            icon='fa fa-font'
            showOnHover
            onClick={() => {}}
          />
          <FontPanel
            font={{...appr.body.font, ...col?.font} as FontAppr}
            onChange={font => {
              this.props.model.getGrid().setApprChange({ columns: {[args.col]: { font } } });
            }}
          />
        </Popover>
      </span>
    );
  };

  private renderTable() {
    const grid = this.props.model.getGrid();
    if (!grid)
      return null;

    return (
      <>
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <GridView
            model={grid}
            renderIcon={this.renderIcon}
          />
        </div>
      </>
    );
  }

  render() {
    return (
      <div style={{ position: 'relative', flexGrow: 1 }}>
        <div className='flexcol' style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
          {this.renderTable()}
        </div>
      </div>
    );
  }
}
