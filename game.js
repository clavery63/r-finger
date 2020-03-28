const imInRegex = /^\s*i'?m in[\!\.\s]*$/i;

const mapSum = map => {
  return [...map.values()].reduce((a, b) => a + b);
};

const formatRow = ([k, v]) => {
  const padding = Array(20 - k.length).fill(' ').join('');
  return `<@${k}>:${padding}${v}`;
};

const printState = fingerMap => {
  const total = mapSum(fingerMap);
  const rows = [...fingerMap.entries()].map(formatRow);
  return `\`\`\`${rows.join('\n')}\n\nTotal:  \t\t${total}\`\`\``;
};

class Game {
  constructor(say, end, initialPlayer) {
    this.say = say;
    this.end = end;
    this.waitingForPlayers = false;
    this.listeningToChoices = false;
    this.playersOrdered = [];
    this.fingerMap = new Map();
    this.guesserIndex = 0;

    this.fingerMap.set(initialPlayer, 2);
    this.playersOrdered.push(initialPlayer);

    this.say('Fingers in, boys!');
    setTimeout(this.waitForPlayers.bind(this), 1000);
  }

  waitForPlayers() {
    this.say('Who\'s in?');
    this.waitingForPlayers = true;
    setTimeout(this.startGame.bind(this), 10000);
  }

  startGame() {
    this.waitingForPlayers = false;
    if (this.playersOrdered.length < 2) {
      this.say('No one joined. Pwned.');
      this.end();
      return;
    }
    const end = this.playersOrdered.length - 1;
    const players = this.playersOrdered.slice(0, end);
    const pString = players.map(p => `<@${p}>`).join(', ')
    const last = this.playersOrdered[end];
    this.say(`Alright let\'s do this. ${pString} and <@${last}> are in.`)
      .then(() => setTimeout(this.gameLoop.bind(this), 1000));
  }

  incrementGuesser() {
    this.guesserIndex = (this.guesserIndex + 1) % this.playersOrdered.length;
  }

  guesser() {
    return this.playersOrdered[this.guesserIndex];
  }

  gameLoop() {
    this.incrementGuesser()
    this.say(`It's <@${this.guesser()}>'s turn.`)
      .then(() => this.say(printState(this.fingerMap), 5000))
      .then(() => this.say('one'))
      .then(() => this.say('two'))
      .then(() => {
        this.listeningToChoices = true;
        this.currentFingers = new Map(this.fingerMap);
        this.currentGuess = mapSum(this.fingerMap);
        return this.say('three', 5000);
      })
      .then(() => {
        this.listeningToChoices = false;
        return this.evaluateChoices();
      })
      .then(() => {
        if (this.playersOrdered.length === 1) {
          const loser = this.playersOrdered[0];
          this.say(`Well golly. <@${loser}> lost.`);
          this.end();
        } else {
          this.gameLoop();
        }
      });
  }

  decrementGuesser() {
    if (this.fingerMap.get(this.guesser()) === 1) {
      return this.say(`<@${this.guesser()}> is out`)
        .then(() => {
          this.fingerMap.delete(this.guesser());
          const guesserIndex = this.playersOrdered.indexOf(this.guesser());
          this.playersOrdered.splice(guesserIndex, 1);
        });
    } else {
      this.fingerMap.set(this.guesser(), this.fingerMap.get(this.guesser()) - 1);
      return Promise.resolve();
    }
  }

  evaluateChoices() {
    const total = mapSum(this.currentFingers);
    if (this.currentGuess === total) {
      return this.say('Got Eem!')
        .then(() => this.decrementGuesser());
    } else {
      return this.say('Nope');
    }
  }

  receiveEvent(e) {
    const { user, text } = e;

    if (this.waitingForPlayers) {
      this.addPlayerFromEvent(user, text);
    } else if (this.listeningToChoices) {
      const choice = parseInt(text);
      if (user === this.guesser() && !isNaN(choice)) {
        this.currentGuess = choice;
      } else if (this.fingerMap.has(user) && !isNaN(choice)) {
        const diff = this.fingerMap.get(user) - choice;
        this.currentFingers.set(user, Math.max(0, diff));
      }
    }
  }

  addPlayerFromEvent(user, text) {
    if (text.match(imInRegex) && !this.fingerMap.has(user)) {
      this.fingerMap.set(user, 2);
      this.playersOrdered.push(user);

      this.say(`<@${user}>'s in.`);
    }
  }
}

module.exports = Game;
