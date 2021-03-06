import React from 'react';
import styled from 'styled-components';

// Just assume stochastic agent for now
import { StochasticAgent } from '../../shared/meta-agents.js';
import env from '../chicken-little/env';

export default class ChickenLittle extends React.Component {
  state = {
    environment: env.reset(),
    play: false,
    agent: null,
    interval: null,
    score: 0,
    actionLog: null,
  }

  importAll = (r) => {
    return r.keys().map(r);
  }

  componentDidMount() {
    /*
    this.setAgent(data_0, 0);
    */
    var freezer = this.importAll(require.context('./freezer', false, /\.(js)$/));
    console.log('chicken');
    console.log(freezer);
    this.props.openFreezer(freezer);
    if (this.props.currentConfig) {
      this.setAgent(this.props.currentParams, this.props.currentConfig);
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps !== this.props) {
      if (this.props.currentConfig) {
        this.setAgent(this.props.currentParams, this.props.currentConfig);
      }
    }
  }

  componentWillUnmount() {
    clearInterval(this.state.interval);
  }

  // Update by a single step (called by setInterval)
  step = () => {
    var { agent } = this.state;
    var feedback = agent.act(this.state.environment, env);
    var done = feedback.done;
    var newScore = this.state.score + feedback.reward;
    this.setState({
      environment: feedback.observation,
      score: newScore,
      actionLog: feedback.info.actionLog,
    });

    if (done) {
      this.togglePlay(false);
    }
  }

  // Returns 0 (or 1 if full) if block is at the given coordinate for rendering
  blockHere = (j, i) => {
    var { aX, aY, bX, bY, cX, cY, x } = this.state.environment;
    if (i === x && j === 1) {
      return '｡';
    } else if (i === x && j === 0) {
      return 'Д';
    } else if (i === aX && j === aY) {
      return 'ბ';
    } else if (i === bX && j === bY) {
      return 'ბ';
    } else if (i === cX && j === cY) {
      return 'ბ';
    }
    return ' ';
  }

  togglePlay = (play) => {
    this.setState({ play });
    if (play) {
      var interval = setInterval(this.step, 100);
      this.setState({ interval });
    } else {
      clearInterval(this.state.interval);
    }
  }

  handleReset = () => {
    this.setState({ environment: env.reset(), score: 0, actionLog: null });
  }

  setAgent = (params, config, i) => {
    var agent = new StochasticAgent(params, config);
    this.setState({ agent });
  }

  renderPlaybackButton = () => {
    if (!this.state.play) {
      return (
        <Button onClick={() => this.togglePlay(true)}>
          <i className="material-icons">play_arrow</i>
          <Label>Play</Label>
        </Button>
      );
    }
    return (
      <Button onClick={() => this.togglePlay(false)}>
        <i className="material-icons">pause</i>
        <Label>Pause</Label>
      </Button>
    );
  }

  renderAscii = () => {
    return (
      <div>
        <div>+---------+</div>
        <div>|
          <X>{this.blockHere(6, 0)}</X>:
          <X>{this.blockHere(6, 1)}</X>:
          <X>{this.blockHere(6, 2)}</X>:
          <X>{this.blockHere(6, 3)}</X>:
          <X>{this.blockHere(6, 4)}</X>|
        </div>
        <div>|
          <X>{this.blockHere(5, 0)}</X>:
          <X>{this.blockHere(5, 1)}</X>:
          <X>{this.blockHere(5, 2)}</X>:
          <X>{this.blockHere(5, 3)}</X>:
          <X>{this.blockHere(5, 4)}</X>|
        </div>
        <div>|
          <X>{this.blockHere(4, 0)}</X>:
          <X>{this.blockHere(4, 1)}</X>:
          <X>{this.blockHere(4, 2)}</X>:
          <X>{this.blockHere(4, 3)}</X>:
          <X>{this.blockHere(4, 4)}</X>|
        </div>
        <div>|
          <X>{this.blockHere(3, 0)}</X>:
          <X>{this.blockHere(3, 1)}</X>:
          <X>{this.blockHere(3, 2)}</X>:
          <X>{this.blockHere(3, 3)}</X>:
          <X>{this.blockHere(3, 4)}</X>|
        </div>
        <div>|
          <X>{this.blockHere(2, 0)}</X>:
          <X>{this.blockHere(2, 1)}</X>:
          <X>{this.blockHere(2, 2)}</X>:
          <X>{this.blockHere(2, 3)}</X>:
          <X>{this.blockHere(2, 4)}</X>|
        </div>
        <div>|
          <X>{this.blockHere(1, 0)}</X>:
          <X>{this.blockHere(1, 1)}</X>:
          <X>{this.blockHere(1, 2)}</X>:
          <X>{this.blockHere(1, 3)}</X>:
          <X>{this.blockHere(1, 4)}</X>|
        </div>
        <div>|
          <X>{this.blockHere(0, 0)}</X>:
          <X>{this.blockHere(0, 1)}</X>:
          <X>{this.blockHere(0, 2)}</X>:
          <X>{this.blockHere(0, 3)}</X>:
          <X>{this.blockHere(0, 4)}</X>|
        </div>
        <div>+---------+</div>
      </div>
    );
  }

  renderActionLog = () => {
    var output;
    switch (this.state.actionLog) {
      case 0:
        output = '(Still)';
        break;
      case 1:
        output = '(Left)';
        break;
      case 2:
        output = '(Right)';
        break;
      default:
          output = '(Start)';
    }
    return <ActionLog>{output}</ActionLog>;
  }

  render() {
    return (
      <StyledMain>
        <DisplayWrapper>
          <Ascii>
            {this.renderAscii()}
            {this.renderActionLog()}
            <div>{this.state.score}</div>
          </Ascii>
        </DisplayWrapper>
        <NavBar>
          {this.renderPlaybackButton()}
          <Button onClick={this.handleReset}>
            <i className="material-icons">restore</i>
            <Label>Reset</Label>
          </Button>
        </NavBar>
      </StyledMain>
    );
  }
}

const Label = styled.div`
  @import url('https://fonts.googleapis.com/css?family=Open+Sans:300,400&display=swap');
  color: white;
  font-family: 'Open Sans', sans-serif;
  font-size: 10px;
  margin-top: -3px;
`;

const Button = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 10px;
  cursor: pointer;
  padding: 5px;
  user-select: none;
  text-align: center;
  margin: 10px;
  margin-top: 15px;
  :hover {
    background: #ffffff22;
  }
  > i {
    color: #ffffffdd;
    font-size: 25px;
  }
`;

const NavBar = styled.div`
  position: fixed;
  width: 150px;
  height: 60px;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  background: #ffffff22;
  bottom: 0;
  left: calc(50vw - 75px);
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;

  opacity: 0;
  animation: float-nav 1s 1s;
  animation-fill-mode: forwards;
  @keyframes float-nav {
    from { bottom: -70px; opacity: 0; }
    to   { bottom: 0px; opacity: 1; }
  }
`;

const ActionLog = styled.div`
  margin-top: 20px;
`;

const X = styled.span`
  color: ${props => props.pickup ? '#FF99E9' : props.dest ? '#5EB9ED' : ''};
  background: ${props => props.block === 0 ? '#fcdf03dd' : props.block === 1 ? '#86f0c4dd' : ''};
`;

const DisplayWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Ascii = styled.div`
  width: 300px;
  height: 300px;
  letter-spacing: 2px;
  text-align: center;
  padding-top: 40px;
  font-weight: 300;
  color: #ffffff99;
  user-select: none;
`;

const StyledMain = styled.div`
  @import url('https://fonts.googleapis.com/css?family=Roboto+Mono:300,400&display=swap');
  font-family: 'Roboto Mono', monospace;
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  background: #c28580;
`;
