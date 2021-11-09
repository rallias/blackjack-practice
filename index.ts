// @ts-ignore No types.
import shuffleInplace from "fisher-yates/inplace";

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from "socket.io";

const app = express();
app.get('/', async (req, res) => {
    res.sendFile(__dirname + "/static/index.html");
});

class Card {
    value: "Ace" | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | "Jack" | "Queen" | "King";
    suite: "Heart" | "Diamond" | "Spade" | "Club";

    constructor(value: "Ace" | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | "Jack" | "Queen" | "King", suite: "Heart" | "Diamond" | "Spade" | "Club") {
        this.value = value;
        this.suite = suite;
    }

    get description() {
        return `${this.value} of ${this.suite}s`;
    }

    get acesLowValue(): number {
        if (this.value >= 2 && this.value <= 10) {
            return +this.value;
        } else if (this.value === "Jack" || this.value === "Queen" || this.value === "King") {
            return 10;
        }
        // Is "Ace"
        return 1;
    }

    get isAce() {
        return this.value === "Ace";
    }
}

var drawCard = (shuffledDeck: Card[], discardPile: Card[]): Card => {
    if (shuffledDeck.length === 0) {
        shuffledDeck.push(...discardPile);
        discardPile.length = 0;
        shuffleInplace(shuffledDeck);
    }

    // @ts-ignore If for some reason this returns undefined, that is a failure somehow.
    return shuffledDeck.pop();
}

const baseDeck: Card[] = [];

["Ace", 2, 3, 4, 5, 6, 7, 8, 9, 10, "Jack", "Queen", "King"].map((value) => {
    ["Heart", "Diamond", "Spade", "Club"].map((suite) => {
        // @ts-ignore Typescript doesn't recognize value to only be valid entries.
        baseDeck.push(new Card(value, suite));
    });
});

const server = http.createServer(app);
const io = new SocketIOServer(server);
var numberOfDecks = 1;

io.on('connection', (socket) => {
    var shuffledDeck: Card[] = [];
    var discardPile: Card[] = [];
    var dealerHand: Card[] = [];
    var dealerAcesLow = 0;
    var dealerAces = false;
    var playerHand: Card[] = [];
    var playerAcesLow = 0;
    var playerAces = false;

    for (var i = 0; i < numberOfDecks; i++) {
        shuffledDeck.push(...baseDeck);
    }

    shuffleInplace(shuffledDeck);

    var state = "startround";

    socket.emit('chat message', "Play round? [y/n]");

    socket.on('chat message', (msg) => {
        if (state === "startround") {
            if (msg === "y") {
                state = "playinground";
                dealerHand.push(drawCard(shuffledDeck, discardPile), drawCard(shuffledDeck, discardPile));
                dealerAcesLow = dealerHand[0].acesLowValue + dealerHand[1].acesLowValue;
                if (dealerHand[0].isAce || dealerHand[1].isAce) {
                    dealerAces = true;
                } else {
                    dealerAces = false;
                }
                playerHand.push(drawCard(shuffledDeck, discardPile), drawCard(shuffledDeck, discardPile));
                playerAcesLow = playerHand[0].acesLowValue + playerHand[1].acesLowValue;
                if (playerHand[0].isAce || playerHand[1].isAce) {
                    playerAces = true;
                } else {
                    playerAces = false;
                }
                socket.emit('chat message', `Dealer hand: ${dealerHand[0].description}`);
                socket.emit('chat message', `Player hand: ${playerHand[0].description}, ${playerHand[1].description}`);
                if (playerAcesLow == 11 && playerAces) {
                    socket.emit('chat message', `Player blackjack!`);
                    socket.emit('chat message', `Hole card: ${dealerHand[1].description}.`);
                    if (dealerAcesLow == 11 && dealerAces) {
                        socket.emit('chat message', `Dealer blackjack. Push.`);
                    } else {
                        socket.emit('chat message', 'Player win.');
                    }
                    discardPile.push(...dealerHand, ...playerHand);
                    dealerHand = [];
                    playerHand = [];
                    socket.emit('chat message', "Play round? [y/n]");
                    state = "startround";
                } else {
                    socket.emit('chat message', '[hit/stand]');
                }
            } else if (msg === "n") {
                state = "broken";
            }
        } else if (state === "playinground") {
            if (msg === "hit") {
                var drawnCard = drawCard(shuffledDeck, discardPile);
                playerHand.push(drawnCard);
                playerAcesLow += drawnCard.acesLowValue;
                socket.emit('chat message', `Player drew ${drawnCard.description}`);
                if (playerAcesLow > 21) {
                    socket.emit('chat message', 'Player busted.');
                    discardPile.push(...dealerHand, ...playerHand);
                    dealerHand = [];
                    playerHand = [];
                    socket.emit('chat message', "Play round? [y/n]");
                    state = "startround";
                } else if (playerAcesLow == 21 || (playerAcesLow == 11 && playerAcesLow)) {
                    socket.emit('chat message', 'Player 21.');
                    socket.emit('chat message', `Hole card ${dealerHand[1].description}`);
                    while (dealerAcesLow < 17 || (dealerAces && dealerAcesLow <= 7)) {
                        var dealerDrawnCard = drawCard(shuffledDeck, discardPile);
                        dealerHand.push(dealerDrawnCard);
                        socket.emit('chat message', `Dealer drew ${dealerDrawnCard.description}`);
                        dealerAcesLow += dealerDrawnCard.acesLowValue;
                        if (dealerDrawnCard.isAce) {
                            dealerAces = true;
                        }
                        if (dealerAcesLow > 21) {
                            socket.emit('chat message', 'Dealer busted.');
                        }
                    }

                    if (dealerAcesLow <= 21) {
                        var playerHandValue = playerAcesLow;
                        if (playerAces && playerHandValue <= 11) {
                            playerHandValue += 10;
                        }
                        var dealerHandValue = dealerAcesLow;
                        if (dealerAces && dealerHandValue <= 11) {
                            dealerHandValue += 10;
                        }

                        if (dealerHandValue > playerHandValue) {
                            socket.emit('chat message', 'Dealer wins.');
                        } else if (dealerHandValue < playerHandValue) {
                            socket.emit('chat message', 'Player wins.');
                        } else {
                            socket.emit('chat message', 'push');
                        }
                    }

                    discardPile.push(...dealerHand, ...playerHand);
                    dealerHand.length = 0;
                    playerHand.length = 0;
                    socket.emit('chat message', "Play round? [y/n]");
                    state = "startround";
                } else {
                    socket.emit('chat message', '[hit/stand]');
                }
            } else if (msg === "stand") {
                socket.emit('chat message', `Hole card ${dealerHand[1].description}`);
                while (dealerAcesLow < 17 || (dealerAces && dealerAcesLow <= 7)) {
                    var dealerDrawnCard = drawCard(shuffledDeck, discardPile);
                    dealerHand.push(dealerDrawnCard);
                    socket.emit('chat message', `Dealer drew ${dealerDrawnCard.description}`);
                    dealerAcesLow += dealerDrawnCard.acesLowValue;
                    if (dealerDrawnCard.isAce) {
                        dealerAces = true;
                    }
                    if (dealerAcesLow > 21) {
                        socket.emit('chat message', 'Dealer busted.');
                    }
                }

                if (dealerAcesLow <= 21) {
                    var playerHandValue = playerAcesLow;
                    if (playerAces && playerHandValue <= 11) {
                        playerHandValue += 10;
                    }
                    var dealerHandValue = dealerAcesLow;
                    if (dealerAces && dealerHandValue <= 11) {
                        dealerHandValue += 10;
                    }

                    if (dealerHandValue > playerHandValue) {
                        socket.emit('chat message', 'Dealer wins.');
                    } else if (dealerHandValue < playerHandValue) {
                        socket.emit('chat message', 'Player wins.');
                    } else {
                        socket.emit('chat message', 'push');
                    }
                }

                discardPile.push(...dealerHand, ...playerHand);
                dealerHand.length = 0;
                playerHand.length = 0;
                socket.emit('chat message', 'Play round? [y/n]');
                state = "startround";
            }
        }
    });
});

server.listen(3002, () => {
    console.log("Listening on *:3002");
});