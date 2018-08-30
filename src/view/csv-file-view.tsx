import * as React from 'react';
import { CSVFileObject } from '../client/csv-file-object';

export interface Props {
  onlyContent?: boolean;
  model: CSVFileObject;
}

export class CSVFileView extends React.Component<Props> {
  subscriber = () => {
    this.setState({});
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.subscriber);
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.subscriber);
  }

  renderCSV(): JSX.Element | string {
    const csv = this.props.model as CSVFileObject;
    if (!(csv instanceof CSVFileObject))
      return null;

    return (
      <div>
        <table>
          <tr>
            <td>Name</td>
            <td>Type</td>
            <td>Discard</td>
          </tr>
          {csv.getColumns().map((col, i) => {
            return (
              <tr key={'row-' + i}>
                <td>
                  {col.name}
                </td>
                <td>
                  <select
                    value={col.type}
                    onChange={event => {
                      csv.setColumn({
                        name: col.name,
                        type: event.target.value
                      });
                    }}>
                    {['TEXT', 'INTEGER', 'REAL', 'DATE'].map(type => {
                      return <option key={type} value={type}>{type}</option>;
                    })}
                  </select>
                </td>
                <td>
                  <input
                    type='checkbox'
                    checked={col.discard}
                    onChange={() => {
                      csv.setColumn({
                        name: col.name,
                        discard: !!!col.discard
                      });
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </table>
      </div>
    );
  }

  renderContent(): JSX.Element | string {
    const state = this.props.model.getState();
    if (!state.isValid() || state.getProgress() < 1)
      return null;

    return this.renderCSV();
  }

  render() {
    const model = this.props.model;
    return (
      <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1}}>
        {this.props.onlyContent != true ? <div>
          <div>name: {model.getName()}</div>
          <div>size: {model.getSize()}</div>
          <div>mime: {model.getMIME()}</div>
          <div>loaded: {model.getLoadSize()}</div>
          <div>progress: {model.getState().getProgress()}</div>
          <div>{model.getState().getType()}</div>
        </div> : null}
        <div style={{flexGrow: 1, display: 'flex', position: 'relative'}}>
          {this.renderContent()}
        </div>
      </div>
    );
  }
}
