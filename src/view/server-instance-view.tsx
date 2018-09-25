import * as React from 'react';
import { ServerInstance } from 'objio/client/server-instance';

export { ServerInstance };

export interface ServerInstProps {
  model: ServerInstance;
}

export class ServerInstanceView extends React.Component<ServerInstProps> {
  renderUsers() {
    return (
      <div>
        <h3>Users</h3>
        <table>
          <thead>
            <tr>
              <th>login</th>
              <th>email</th>
              <th>rights</th>
              <th>groups</th>
            </tr>
          </thead>
          <tbody>
            {this.props.model.getUsers().map((user, i) => {
              return (
                <tr key={i}>
                  <td>{user.login}</td>
                  <td>{user.email}</td>
                  <td></td>
                  <td></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  renderGroups() {
    return null;
  }

  render() {
    return (
      <div>
        {this.renderUsers()}
      </div>
    );
  }
}
