/*
  ### TAXI V3 - PROBLEM SPECIFICATION ###
  Passenger locations:
  - 0: R(ed)
  - 1: G(reen)
  - 2: Y(ellow)
  - 3: B(lue)
  - 4: in taxi
  Destinations:
  - 0: R(ed)
  - 1: G(reen)
  - 2: Y(ellow)
  - 3: B(lue)
  Actions:
  There are 6 discrete deterministic actions:
  - 0: move south
  - 1: move north
  - 2: move east
  - 3: move west
  - 4: pickup passenger
  - 5: dropoff passenger
  Rewards:
  There is a reward of -1 for each action and an additional reward of +20 for
  delivering the passenger. There is a reward of -10 for executing actions "pickup"
  and "dropoff" illegally.
  ------------------
  Checklist:
  [X] Straight up
  [X] Fixed (no walls) // checked 4-way symmetric
  [X] Fixed (walls)
  [X] Start at pickup (fixed)
  [ ] Fixed proper (go to pickup and then to dropoff)
  [ ] Finale.
*/

const chalk = require('chalk');
const math = require('mathjs');

// Settings
const maxGenerations = 10000;
const alpha = 0.00005;
const sigma = 0.15;
const moveLimit = 800;
const population = 100;
const numTrials = 10;

// [Borrowed] Standard Normal variate using Box-Muller transform.
var randn_bm = () => {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

// [Borrowed] Softmax
var softmax = (arr) => {
    return arr.map(function(value,index) {
      return Math.exp(value) / arr.map( function(y /*value*/){ return Math.exp(y) } ).reduce( function(a,b){ return a+b })
    })
}

// Render state visualization
var draw = (state) => {
  let r1r2 = [1, 3, 4];
  let r3 = [1, 2, 3, 4];
  let r4r5 = [2, 4];
  process.stdout.write('\n      +---------+');
  for (let j=0; j < 5; j++) {
    process.stdout.write('\n      ');
    for (let i=0; i < 5; i++) {

      let wall = '|';
      if (((j === 0 || j === 1) && r1r2.includes(i)) ||
        ((j === 2) && r3.includes(i)) ||
        ((j === 3 || j === 4) && r4r5.includes(i))) {
        wall = ':';
      }

      let letter = ' ';
      let style = chalk;
      if (j === 0 && i === 0) {
        if (state.passenger === 0) {
          style = style.hex('#00c3ff');
        } else if (state.destination === 0) {
          style = style.hex('#dd69ff');
        }
        letter = 'R';
      } else if (j === 0 && i === 4) {
        if (state.passenger === 1) {
          style = style.hex('#00c3ff');
        } else if (state.destination === 1) {
          style = style.hex('#dd69ff');
        }
        letter = 'G';
      } else if (j === 4 && i === 3) {
        if (state.passenger === 2) {
          style = style.hex('#00c3ff');
        } else if (state.destination === 2) {
          style = style.hex('#dd69ff');
        }
        letter = 'B';
      } else if (j === 4 && i === 0) {
        if (state.passenger === 3) {
          style = style.hex('#00c3ff');
        } else if (state.destination === 3) {
          style = style.hex('#dd69ff');
        }
        letter = 'Y';
      }

      if (j === state.taxiRow && i === state.taxiColumn) {
        if (state.passenger === 4) {
          style = style.bgHex('#6ef5a9');
        } else {
          style = style.bgHex('#ffdf6b');
        }
      }

      let fill = style(letter);
      process.stdout.write(wall + fill);
    }
    process.stdout.write('|');
  }
  process.stdout.write('\n      +---------+\n');

  switch (state.actionLog) {
      case 0:
          console.log('        (South)');
          break;
      case 1:
          console.log('        (North)');
          break;
      case 2:
          console.log('        (East)');
          break;
      case 3:
          console.log('        (West)');
          break;
      case 4:
          console.log('        (Pickup)');
          break;
      case 5:
          console.log('        (Dropoff)');
          break;
      default:
          console.log('        (Start)');
          break;
  }
}

// Re-initialize state
var refreshState = (state) => {
  state.taxiRow = Math.floor(Math.random() * 5);
  state.taxiColumn = Math.floor(Math.random() * 5);

  // Ensure pickup !== dropoff w/ randomization
  let locations = [0, 1, 2, 3];
  locations.sort(() => Math.random() - 0.5);
  state.passenger = locations[0];
  state.destination = locations[1];

  state.actionLog = null;
  return state;
}

var successes = 0;

// Evaluates a single agent on initial state
var evaluate = (agent, initState, display) => {
  let state = { ...initState };
  if (display) {
    draw(state);
  }

  // Evaluation loop
  let reward = 0;
  let moveCount = 0;
  while (moveCount <= moveLimit) {
    let delta = agent.actOnState(state);
    if (display) {
      draw(state);
    }

    reward += delta;
    if (delta === 20) {
      successes += 1;
      break;
    }
    moveCount += 1;
  }
  return reward;
}

// Processes a single update to theta
var updateTheta = (theta, epsilons, rewards) => {
  let accEpsilon = math.zeros([136, 1]);
  for (var j=0; j < population; j++) {
    let weighedEpsilon = math.multiply(rewards[j], epsilons[j]);
    accEpsilon = math.add(accEpsilon, weighedEpsilon);
  }
  accEpsilon = math.multiply(alpha/(population*sigma), accEpsilon);
  return math.add(theta, accEpsilon);
}

// Check for a wall on move attempt
var canMove = (row, column, dir) => {
  if (dir === -1) {
    if (row < 2 && column === 2) {
      return false;
    }
    if (row > 2 && (column === 1 || column === 3)) {
      return false;
    }
  } else {
    if (row < 2 && column === 1) {
      return false;
    }
    if (row > 2 && (column === 0 || column === 2)) {
      return false;
    }
  }
  return true;
}

// Check for valid pickup attempt
var validPickup = (row, column, passenger) => {
  if (passenger === 0 && row === 0 && column === 0) {
    return true;
  } else if (passenger === 1 && row === 0 && column === 4) {
    return true;
  } else if (passenger === 2 && row === 4 && column === 0) {
    return true;
  } else if (passenger === 3 && row === 4 && column === 3) {
    return true;
  }
  return false;
}

// Check for correct dropoff attempt
var correctDropoff = (state) => {
  let { taxiRow, taxiColumn, passenger, destination } = state;
  if (passenger !== 4) {
    return false;
  } else if (destination === 0 && taxiRow === 0 && taxiColumn === 0) {
    return true;
  } else if (destination === 1 && taxiRow === 0 && taxiColumn === 4) {
    return true;
  } else if (destination === 2 && taxiRow === 4 && taxiColumn === 0) {
    return true;
  } else if (destination === 3 && taxiRow === 4 && taxiColumn === 3) {
    return true;
  }
  return false;
}

// Check valid dropoff (-1 for invalid, 0-3 for location)
var validDropoff = (taxiRow, taxiColumn) => {
  if (taxiRow === 0 && taxiColumn === 0) {
    return 0;
  } else if (taxiRow === 0 && taxiColumn === 4) {
    return 1;
  } else if (taxiRow === 4 && taxiColumn === 0) {
    return 2;
  } else if (taxiRow === 4 && taxiColumn === 3) {
    return 3;
  }
  return -1;
}

// Executes one stochastic action and returns action reward
var stochasticMove = (output, state) => {
  let decision = Math.random();
  let soft = softmax(output);
  threshOne = soft[0];
  threshTwo = threshOne + soft[1];
  threshThree = threshTwo + soft[2];
  threshFour = threshThree + soft[3];
  threshFive = threshFour + soft[4];
  if (decision <= threshOne) {
    state.actionLog = 1;
    if (state.taxiRow > 0) {
      state.taxiRow -= 1;
    }
  } else if (decision <= threshTwo) {
    state.actionLog = 0;
    if (state.taxiRow < 4) {
      state.taxiRow += 1;
    }
  } else if (decision <= threshThree) {
    state.actionLog = 3;
    if (state.taxiColumn > 0 && canMove(state.taxiRow, state.taxiColumn, -1)) {
      state.taxiColumn -= 1;
    }
  } else if (decision <= threshFour) {
    state.actionLog = 2;
    if (state.taxiColumn < 4 && canMove(state.taxiRow, state.taxiColumn, 1)) {
      state.taxiColumn += 1;
    }
  } else if (decision <= threshFive) {
    state.actionLog = 4;
    if (validPickup(state.taxiRow, state.taxiColumn, state.passenger)) {
      state.passenger = 4;
    } else {
      return -10;
    }
  } else {
    state.actionLog = 5;
    if (correctDropoff(state)) {
      return 20;
    } else if (validDropoff(state) !== -1 && state.passenger === 4) {
      state.passenger = validDropoff(state);
      return -1;
    }
    return -10;
  }
  return -1;
}

// Agent object [Sanity Check]
function Agent(params) {
  'use strict';
  this.l1 = math.reshape(params.slice(0, 20), [5, 4]);
  this.l2 = math.reshape(params.slice(20, 70), [5, 10]);
  this.l3 = math.reshape(params.slice(70, 136), [11, 6])
}
Agent.prototype.actOnState = function(state) {
  // Fire neural network
  let { taxiRow, taxiColumn, passenger, destination } = state;
  let input = [1, taxiRow, taxiColumn, passenger, destination];
  let h1 = math.multiply(input, this.l1);
  h1 = math.map(h1, (x) => { return Math.max(x, 0) });
  h1 = math.concat([1], h1);
  let h2 = math.multiply(h1, this.l2);
  h2 = math.map(h2, (x) => { return Math.max(x, 0) });
  h2 = math.concat([1], h2);
  let output = math.multiply(h2, this.l3);

  /*
  let { taxiRow, taxiColumn, passenger, destination } = state;
  let input = [1, taxiRow, taxiColumn, passenger, destination];
  let h1 = math.multiply(input, this.l1);
  h1 = math.map(h1, (x) => { return Math.max(x, 0) });
  h1 = math.concat([1], h1);
  let h2 = math.multiply(h1, this.l2);
  h2 = math.map(h2, (x) => { return Math.max(x, 0) });
  h2 = math.concat([1], h2);
  let output = math.multiply(h2, this.l3);
  */

  // Stochastic policy action (passively updates state and returns reward)
  return stochasticMove(output, state);
};

// Fitness shaping function
var remapFitnesses = (rewards) => {
  let sorted = rewards.slice();
  sorted.sort((a, b) => a - b);
  return rewards.map((x, i) => {
    return sorted.indexOf(x);
  })
}

// Main learning loop [Sanity Check]
var evolve = () => {
  let map = {
    taxiRow: 2,
    taxiColumn: 2,
    passenger: 1,
    destination: 0,
    actionLog: null,
  }
  let theta = math.random([136, 1], 0.1);

  // Generation loop
  let averageFitness = 0;
  for (var g=0; g < maxGenerations; g++) {
    successes = 0;

    let epsilons = [];
    let rewards = [];
    let maxFitness = -999999;
    for (var i=0; i < population; i++) {
      // Generate epsilon/perturbation vector
      let perturbVec = []
      for (var p=0; p < 136; p++) {
        perturbVec.push(randn_bm());
      }
      perturbVec = math.reshape(perturbVec, [136, 1]);
      epsilons.push(perturbVec);

      // Create and evaluate agent
      let params = math.add(theta, math.multiply(sigma, perturbVec));
      let agent = new Agent(params);
      let reward = 0;
      for (var t=0; t < numTrials; t++) {
        map = refreshState(map);
        reward += evaluate(agent, map, false);
      }
      rewards.push(reward);

      if (reward > maxFitness) {
        maxFitness = reward;
      }
    }

    fitnesses = remapFitnesses(rewards);
    theta = updateTheta(theta, epsilons, fitnesses);

    averageFitness = rewards.reduce((a,b) => a + b, 0)/population;
    console.log(g + ', ' + maxFitness + ', ' + averageFitness + ', ' + successes);

    if (averageFitness >= 5) {
      break;
    }
  }

  console.log()
  let apex = new Agent(theta);
  evaluate(apex, map, true);
  console.log();
}
evolve();