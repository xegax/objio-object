import * as React from 'react';
import { DatabaseTable } from '../client/database/database-table';
import { Grid, CellProps, HeaderProps, CardProps } from 'ts-react-ui/grid/grid';
import { HorizontalResizer } from 'ts-react-ui/resizer';
import { SortingCtrl } from 'ts-react-ui/sorting-ctrl';
import { FontAppr } from '../base/appr-decl';

export { DatabaseTable };

function getFontStyle(f: Array<FontAppr>, align: boolean): React.CSSProperties {
  if (!f)
    return {};

  let font: Partial<FontAppr> = f[0] || {};
  for (let n = 1; n < f.length; n++)
    font = {...font, ...f[n]};

  return {
    color: font.color,
    fontFamily: font.family,
    fontWeight: font.bold ? 'bold' : undefined,
    fontStyle: font.italic ? 'italic' : undefined,
    fontSize: font.sizePx,
    textAlign: align ? font.align : undefined
  };
}

export interface Props {
  model: DatabaseTable;
}

interface State {
  detailsSize: number;
}

export class DatabaseTableView extends React.Component<Props, State> {
  state: State = {
    detailsSize: 100
  };

  notify = () => {
    this.setState({});
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.notify);
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.notify);
  }

  renderNotConfigured() {
    return 'object not configured properly';
  }

  renderCard = (props: CardProps) => {
    const m = this.props.model;
    const appr = m.getAppr();
    const body = appr.cardsView.body;
    const header = appr.cardsView.header;
    const footer = appr.cardsView.footer;

    const row = m.getGrid().getRowOrLoad(props.row);
    let jsxHeader: JSX.Element | null = null;
    let jsxBody: JSX.Element | null = null;
    let jsxFooter: JSX.Element | null = null;

    if (header && header.column) {
      const c = m.getColumnProp(header.column);
      jsxHeader = (
        <div
          className='table-card-header'
          style={getFontStyle([appr.body.font, c.font, header.font], true)}
        >
          {row.obj[c.column]}
        </div>
      );
    }

    if (footer && footer.column) {
      const c = m.getColumnProp(footer.column);
      jsxFooter = (
        <div
          className='table-card-footer'
          style={getFontStyle([appr.body.font, c.font, footer.font], true)}
        >
          {row.obj[c.column]}
        </div>
      );
    }

    if (body && body.column) {
      const c = m.getColumnProp(body.column);
      if (c.dataType == 'image') {
        jsxBody = (
          <div
            style={{
              flexGrow: 1,
              backgroundImage: `url(${row.obj[body.column]})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundOrigin: 'content-box'
            }}
          />
        );
      } else {
        jsxBody = (
          <div
            className='table-card-body'
            style={getFontStyle([appr.body.font, c.font, body.font], true)}
          >
            {row.obj[body.column]}
          </div>
        );
      }
    }

    return (
      <div className='table-grid-card'>
        {jsxHeader}
        {jsxBody}
        {jsxFooter}
      </div>
    );
  }

  renderCell = (props: CellProps) => {
    const row = this.props.model.getGrid().getRowOrLoad(props.row);
    if (!row)
      return null;

    const colAppr = this.props.model.getColumnApprByIdx(props.col);
    const align = colAppr.font.align;
    if (align)
      props.className = 'cell-align-' + align;

    return (
      <span style={getFontStyle([colAppr.font], false)}>
        {row.cell[props.col]}
      </span>
    );
  }

  renderHeader = (props: HeaderProps) => {
    const cols = this.props.model.getCols().getColsToShow('order');

    const colName = cols[props.col];
    const c = this.props.model.getAppr().columns[colName] || {};
    return (
      <span>{c.label || colName}</span>
    );
  }

  renderDetails() {
    const appr = this.props.model.getAppr();
    if (!appr.selPanel.enable || !appr.selPanel.columns.length)
      return null;

    const s = {
      height: this.state.detailsSize,
      flexGrow: 0,
      backgroundColor: 'white',
      overflow: 'auto',
      padding: 5
    };

    return (
      <>
        <div style={s}>
          {(this.props.model.getSelData() || []).map(f => {
            const props = this.props.model.getColumnProp(f.key);

            if (props.dataType == 'image') {
              return (
                <div key={f.key}>
                  <img src={f.value}/>
                </div>
              );
            }

            return (
              <div key={f.key}>
                <span style={{ fontWeight: 'bold' }}>
                  {props.label || f.key}
                </span>: {f.value}
              </div>
            );
          })}
        </div>
        <div style={{ flexGrow: 0, height: 5, position: 'relative' }}>
          <HorizontalResizer
            side='center'
            size={this.state.detailsSize}
            onResizing={size => {
              this.setState({ detailsSize: size });
            }}
          />
        </div>
      </>
    );
  }

  renderToolbar() {
    const m = this.props.model;
    const grid = m.getGrid();
    if (!grid)
      return null;

    const columns = m.getColumns().map(col => ({ value: col.column, render: col.render }));

    return (
      <div style={{ flexGrow: 0, display: 'flex', alignItems: 'center' }}>
        <div style={{ flexGrow: 1 }}>
          Number of rows: {grid.getTotalRowsCount()}
        </div>
        <SortingCtrl
          style={{ flexGrow: 0 }}
          available={columns}
          sorting={m.getSorting()}
          reverse={m.isReverse()}
          onReverse={reverse => {
            m.setReverse(reverse);
          }}
          onApply={sorting => {
            m.setSorting(sorting);
          }}
        />
      </div>
    );
  }

  renderTable() {
    const grid = this.props.model.getGrid();
    if (!grid)
      return null;

    const appr = this.props.model.getAppr();
    return (
      <>
        {this.renderToolbar()}
        {this.renderDetails()}
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <Grid
            model={grid}
            oddRow={appr.body.oddRow}
            evenRow={appr.body.evenRow}
            renderHeader={this.renderHeader}
            renderCell={this.renderCell}
            renderCard={this.renderCard}
            onScrollToBottom={() => {
              grid.loadNext();
            }}
          />
        </div>
      </>
    );
  }

  render() {
    const model = this.props.model;
    let jsx: React.ReactChild;
    if (!model.getDatabase() || !model.getTableName() || !model.isTableValid())
      jsx = this.renderNotConfigured();
    else if (!model.isStatusInProgess())
      jsx = this.renderTable();

    return (
      <div style={{ position: 'relative', flexGrow: 1 }}>
        <div className='flexcol' style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
          {jsx}
        </div>
      </div>
    );
  }
}
