import * as React from 'react';
import { JSONTableFile } from '../client/table-file';

export { JSONTableFile };

export interface Props {
  onlyContent?: boolean;
  model: JSONTableFile;
}

export class JSONFileView extends React.Component<Props> {
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
    const csv = this.props.model as JSONTableFile;
    if (!(csv instanceof JSONTableFile))
      return null;

    return (
      <div>
        <table>
        <tbody>
          <tr>
            <td>Name</td>
            <td>Type</td>
            <td>Index</td>
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
                    {[
                      'TEXT',
                      'INTEGER',
                      'REAL',
                      'DATE',
                      'VARCHAR(16)',
                      'VARCHAR(32)',
                      'VARCHAR(64)',
                      'VARCHAR(128)',
                      'VARCHAR(256)'
                    ].map(type => {
                      return <option key={type} value={type}>{type}</option>;
                    })}
                  </select>
                </td>
                <td>
                  <input
                    type='checkbox'
                    checked={col.index}
                    onChange={() => {
                      csv.setColumn({
                        name: col.name,
                        index: !!!col.index
                      });
                    }}
                  />
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
        </tbody>
        </table>
      </div>
    );
  }

  renderContent(): JSX.Element | string {
    const model = this.props.model;
    if (!model.isStatusValid() || model.getProgress() < 1)
      return null;

    return this.renderCSV();
  }

  render() {
    return (
      <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1}}>
        <div style={{flexGrow: 1, display: 'flex', position: 'relative'}}>
          {this.renderContent()}
        </div>
      </div>
    );
  }
}
