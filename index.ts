// @ts-ignore
import shuffleInplace from "fisher-yates/inplace";
// @ts-ignore
import readline from 'readline-promise';

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

    get acesLowValue() {
        if (this.value >= 2 && this.value <= 10) {
            return +this.value;
        } else if (this.value === "Jack" || this.value === "Queen" || this.value === "King") {
            return 10;
        } else if (this.value === "Ace") {
            return 1;
        }
    }

    get isAce() {
        return this.value === "Ace";
    }
}

const baseDeck: Card[] = [];

["Ace", 2, 3, 4, 5, 6, 7, 8, 9, 10, "Jack", "Queen", "King"].map((value) => {
    ["Heart", "Diamond", "Spade", "Club"].map((suite) => {
        // @ts-ignore
        baseDeck.push(new Card(value, suite));
    });
});

var numberOfDecks = 1;

var shuffledDeck: Card[] = [];

for (var i = 0; i < numberOfDecks; i++) {
    shuffledDeck.push(...baseDeck);
}

shuffleInplace(shuffledDeck);

const rlp = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
});

(async () => {
    game: while (true) {
        var nextRound = await rlp.questionAsync("Play round? (y/n)");
        if (nextRound === "n") {
            process.stdout.write("Goodbye.\n");
            process.exit(0);
        } else if (nextRound !== "y") {
            continue game;
        }
        var dealerHand = [shuffledDeck.pop(), shuffledDeck.pop()];
        var playerHand = [shuffledDeck.pop(), shuffledDeck.pop()];
        var acesLowValue = 0;
        var acesCount = 0;
        // @ts-ignore
        acesLowValue += playerHand[0]?.acesLowValue;
        // @ts-ignore
        acesLowValue += playerHand[1]?.acesLowValue;

        if (playerHand[0]?.isAce) {
            acesCount++;
        }
        if (playerHand[1]?.isAce) {
            acesCount++;
        }

        if (acesLowValue == 11 && acesCount >= 1) {
            process.stdout.write("Blackjack on draw!\n");
        } else {
            round: while (true) {
                // @ts-ignore
                var play = await rlp.questionAsync(`Dealer: ${dealerHand[0]?.description}.\nPlayer: ${playerHand.map((card) => { return card.description }).join(", ")}\n[hit/stand]`);
                if (play === "hit") {
                    var drawnCard = shuffledDeck.pop();
                    playerHand.push(drawnCard);
                    // @ts-ignore
                    process.stdout.write(`Drew ${drawnCard.description}.\n`);
                    // @ts-ignore
                    acesLowValue += drawnCard?.acesLowValue;
                    if (drawnCard?.isAce) {
                        acesCount++;
                    }

                    if (acesLowValue > 21) {
                        process.stdout.write("Busted.\n");
                        continue game;
                    }

                    if (acesLowValue == 21 || (acesLowValue == 11 && acesCount >= 1)) {
                        process.stdout.write("Blackjack!\n");
                    }
                } else if (play === "stand") {
                    break round;
                }
            }
        }

        var dealerAcesLowValue = 0;
        var dealerAces = 0;
        process.stdout.write("Dealer hand: \n");
        // @ts-ignore
        process.stdout.write(`${dealerHand[0].description}\n`);
        // @ts-ignore
        process.stdout.write(`${dealerHand[1].description}\n`);

        dealer: while (true) {
            if (dealerAcesLowValue >= 17 || (dealerAcesLowValue >= 7 && dealerAces >= 1)) {
                break dealer;
            }

            var drawnCard = shuffledDeck.pop();
            dealerHand.push(drawnCard);
            // @ts-ignore
            process.stdout.write(`Drew ${drawnCard.description}\n`);
            // @ts-ignore
            dealerAcesLowValue += drawnCard?.acesLowValue;
            // @ts-ignore
            dealerAces += drawnCard?.isAce;
            if (dealerAcesLowValue > 21) {
                process.stdout.write(`Dealer busted.\n`);
                break dealer;
            }
            if (dealerAcesLowValue === 21 || (dealerAcesLowValue === 11 && dealerAces >= 1)) {
                process.stdout.write(`Dealer blackjack!\n`);
            }
        }

        var dealerValue = dealerAcesLowValue;
        if (dealerValue <= 11 && dealerAces >= 1) {
            dealerValue += 10;
        }

        var playerValue = acesLowValue;
        if (playerValue <= 11 && acesCount) {
            playerValue += 10;
        }

        console.log(`Player value: ${playerValue}`);
        console.log(`Dealer value: ${dealerValue}`);

        if ((dealerValue > 21) && (playerValue > 21)) {
            process.stdout.write("No winners, both busted.\n");
        }

        if ((dealerValue > 21) && (playerValue <= 21)) {
            process.stdout.write("Player win, dealer busted.\n");
        }

        if ((dealerValue <= 21) && (playerValue > 21)) {
            process.stdout.write("Dealer win, player busted.\n");
        }

        if (dealerValue > playerValue) {
            process.stdout.write(`Dealer wins: ${dealerValue} > ${playerValue}.\n`);
        }

        if (dealerValue < playerValue) {
            process.stdout.write(`Player wins: ${dealerValue} < ${playerValue}\n`);
        }

        if (dealerValue == playerValue) {
            process.stdout.write(`Draw: ${dealerValue} == ${playerValue}\n`);
        }
    }
})();