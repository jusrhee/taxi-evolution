const env = require('./env');
const { Driver } = require('./agents');
const math = require('mathjs');
const fs = require('fs');

// Settings
const maxGenerations = 10000;
const alpha = 0.0003;
const sigma = 0.1;
const moveLimit = 800;
const population = 100;
const numTrials = 1;

// [Borrowed] Standard Normal variate using Box-Muller transform.
var randn_bm = () => {
  var u = 0, v = 0;
  while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while(v === 0) v = Math.random();
  return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

// Evaluates a single agent
var evaluateAgent = (agent) => {
  var reward = 0;
  var moveCount = 0;
  var observation = env.reset();
  while (moveCount <= moveLimit) {
    var feedback = agent.act(observation, env);
    var delta = feedback.reward;
    var done = feedback.done;
    observation = feedback.observation;

    reward += delta;
    if (done) {
      successes += 1;
      break;
    }
    moveCount += 1;
  }
  return reward;
}

// Processes a single update to theta
var updateTheta = (theta, epsilons, rewards) => {
  var accEpsilon = math.zeros([136, 1]);
  for (var j=0; j < population; j++) {
    var weighedEpsilon = math.multiply(rewards[j], epsilons[j]);
    accEpsilon = math.add(accEpsilon, weighedEpsilon);
  }
  accEpsilon = math.multiply(alpha/(population*sigma), accEpsilon);
  return math.add(theta, accEpsilon);
}

// Fitness shaping function
var remapFitnesses = (rewards) => {
  var sorted = rewards.slice();
  sorted.sort((a, b) => a - b);
  return rewards.map((x, i) => {
    return sorted.indexOf(x);
  })
}

// Main learning loop
var theta = math.random([136, 1], 0.1);
var averageFitness = 0;
var successes = 0;
for (var g=0; g < maxGenerations; g++) {
  successes = 0;

  var epsilons = [];
  var rewards = [];
  var maxFitness = -999999;
  var championParams;
  for (var i=0; i < population; i++) {

    // Generate epsilon/perturbation vector
    var perturbVec = []
    for (var p=0; p < 136; p++) {
      perturbVec.push(randn_bm());
    }
    perturbVec = math.reshape(perturbVec, [136, 1]);
    epsilons.push(perturbVec);

    // Create and evaluate agent
    var params = math.add(theta, math.multiply(sigma, perturbVec));
    var agent = new Driver(params);
    var reward = 0;
    for (var t=0; t < numTrials; t++) {
      //map = refreshState(map);
      reward += evaluateAgent(agent);
    }
    rewards.push(reward);

    if (reward > maxFitness) {
      maxFitness = reward;
      championParams = params;
    }
  }

  fitnesses = remapFitnesses(rewards);
  theta = updateTheta(theta, epsilons, fitnesses);
  averageFitness = rewards.reduce((a,b) => a + b, 0)/population;
  console.log(g, maxFitness, averageFitness, successes);

  if (g % 200 === 0) {
    var encoded = JSON.stringify(championParams)
    fs.writeFileSync("./freezer/" + g + ".JSON", encoded);
  }
  if (averageFitness >= 5) {
    break;
  }
}
