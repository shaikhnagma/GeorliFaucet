import { IPoWMinerStats, PoWMiner } from '../common/PoWMiner';
import { PoWSession } from '../common/PoWSession';
import React from 'react';
import { weiToEth } from '../utils/ConvertHelpers';
import { IFaucetConfig } from '../common/IFaucetConfig';
import { renderDate, renderTime, renderTimespan } from '../utils/DateUtils';
import { PoWClient } from 'common/PoWClient';

export interface IPoWFaucetStatusProps {
  powClient: PoWClient;
  faucetConfig: IFaucetConfig;
}

export interface IPoWFaucetStatusState {
  refreshing: boolean;
  activeSessions: IPoWFaucetStatusSession[];
  activeClaims: IPoWFaucetStatusClaim[];
}

interface IPoWFaucetStatus {
  sessions: IPoWFaucetStatusSession[];
  claims: IPoWFaucetStatusClaim[];
}

interface IPoWFaucetStatusSession {
  id: string;
  start: number;
  idle: number | null;
  target: string;
  balance: number;
  nonce: number;
  hashrate: number;
}

interface IPoWFaucetStatusClaim {
  time: number;
  target: string;
  amount: number;
  status: string;
  nonce: number | null;
}

export class PoWFaucetStatus extends React.PureComponent<IPoWFaucetStatusProps, IPoWFaucetStatusState> {

  constructor(props: IPoWFaucetStatusProps, state: IPoWFaucetStatusState) {
    super(props);

    this.state = {
      refreshing: false,
      activeSessions: [],
      activeClaims: [],
		};
  }

  public componentDidMount() {
    if(!this.state.refreshing) {
      this.refreshFaucetStatus();
    }
  }

  public componentWillUnmount() {
  }

  private refreshFaucetStatus() {
    this.setState({
      refreshing: true
    });
    this.props.powClient.sendRequest<IPoWFaucetStatus>("getFaucetStatus").then((faucetStatus) => {
      this.setState({
        refreshing: false,
        activeSessions: (faucetStatus.sessions || []).sort((a, b) => a.start - b.start),
        activeClaims: (faucetStatus.claims || []).sort((a, b) => a.time - b.time),
      });
    });
  }

	public render(): React.ReactElement<IPoWFaucetStatusProps> {
    let now = Math.floor((new Date()).getTime() / 1000);

    return (
      <div className='container grid faucet-status'>
        <div className='row'>
          <div className='col-md-auto'>
            <h1>PoW Faucet Status</h1>
          </div>
          <div className='col'>
            <button type="button" className="btn btn-primary status-refresh" onClick={() => this.refreshFaucetStatus()} disabled={this.state.refreshing}>Refresh</button>
          </div>
        </div>
        <div className='row'>
          <div className='col-12 card status-panel'>
            <div className="card-body">
              <h5 className="card-title">Active mining sessions</h5>

              {this.renderActiveSessions()}
            </div>
          </div>
          <div className='col-12 card status-panel'>
            <div className="card-body">
              <h5 className="card-title">Reward claim transactions</h5>

              {this.renderActiveClaims()}
            </div>
          </div>
        </div>
      </div>
    );
	}

  private renderActiveSessions(): React.ReactElement {
    return (
      <table className="table table-striped status-sessions">
        <thead>
          <tr>
            <th scope="col">Session</th>
            <th scope="col">Target Address</th>
            <th scope="col">Start Time</th>
            <th scope="col">Timeout</th>
            <th scope="col">Balance</th>
            <th scope="col">Nonce</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {this.state.activeSessions.length > 0 ?
            this.state.activeSessions.map((session) => this.renderActiveSessionRow(session)) :
            <tr key="none">
              <th scope="row" colSpan={7}>No active sessions</th>
            </tr>
          }
        </tbody>
      </table>
    );
  }

  private renderActiveSessionRow(session: IPoWFaucetStatusSession): React.ReactElement {
    return (
      <tr key={session.id}>
        <th scope="row">{session.id}</th>
        <td>{session.target}</td>
        <td>{renderDate(new Date(session.start * 1000), true)}</td>
        <td>{renderDate(new Date((session.start + this.props.faucetConfig.powTimeout) * 1000), true)}</td>
        <td>{Math.round(weiToEth(session.balance) * 1000) / 1000} ETH</td>
        <td>{session.nonce}</td>
        <td>
          {session.idle ?
            <span className="badge bg-secondary">Idle ({renderTime(new Date(session.idle * 1000))})</span> :
            <span className="badge bg-success">Mining ({Math.round(session.hashrate * 100) / 100} H/s)</span>
          }
        </td>
      </tr>
    );
  }

  private renderActiveClaims(): React.ReactElement {
    return (
      <table className="table table-striped status-sessions">
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">To Address</th>
            <th scope="col">Amount</th>
            <th scope="col">Nonce</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {this.state.activeClaims.length > 0 ?
            this.state.activeClaims.map((claim) => this.renderActiveClaimRow(claim)) :
            <tr key="none">
              <th scope="row" colSpan={5}>No active claims</th>
            </tr>
          }
        </tbody>
      </table>
    );
  }

  private renderActiveClaimRow(claim: IPoWFaucetStatusClaim): React.ReactElement {
    let claimStatus: React.ReactElement = null;
    switch(claim.status) {
      case "queue":
        claimStatus = <span className="badge bg-secondary">Queued</span>;
        break;
      case "pending":
        claimStatus = <span className="badge bg-primary">Pending</span>;
        break;
      case "confirmed":
        claimStatus = <span className="badge bg-success">Confirmed</span>;
        break;
      case "failed":
        claimStatus = <span className="badge bg-danger">Failed</span>;
        break;
      default:
        claimStatus = <span className="badge bg-light text-dark">{claim.status}</span>;
    }

    return (
      <tr key={(claim.time + "-" + claim.target)}>
        <th scope="row">{renderDate(new Date(claim.time * 1000), true, true)}</th>
        <td>{claim.target}</td>
        <td>{Math.round(weiToEth(claim.amount) * 1000) / 1000} ETH</td>
        <td>{claim.nonce || ""}</td>
        <td>{claimStatus}</td>
      </tr>
    );
  }

}