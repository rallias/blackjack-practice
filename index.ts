// @ts-ignore No types.
import shuffleInplace from "fisher-yates/inplace";
// @ts-ignore No types.
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

const baseDeck: Card[] = [];

["Ace", 2, 3, 4, 5, 6, 7, 8, 9, 10, "Jack", "Queen", "King"].map((value) => {
    ["Heart", "Diamond", "Spade", "Club"].map((suite) => {
        // @ts-ignore Typescript doesn't recognize value to only be valid entries.
        baseDeck.push(new Card(value, suite));
    });
});

var numberOfDecks = 1;

var shuffledDeck: Card[] = [];
var discardPile: Card[] = [];

var drawCard = (): Card => {
    if (shuffledDeck.length === 0) {
        shuffledDeck.push(...discardPile);
        discardPile = [];
        shuffleInplace(shuffledDeck);
    }

    // @ts-ignore If for some reason this returns undefined, that is a failure somehow.
    return shuffledDeck.pop();
}

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
        var dealerHand = [drawCard(), drawCard()];
        var playerHand = [drawCard(), drawCard()];
        var acesLowValue = 0;
        var acesCount = 0;
        acesLowValue += playerHand[0].acesLowValue;
        acesLowValue += playerHand[1].acesLowValue;

        if (playerHand[0].isAce) {
            acesCount++;
        }
        if (playerHand[1].isAce) {
            acesCount++;
        }

        if (acesLowValue == 11 && acesCount >= 1) {
            process.stdout.write("Blackjack on draw!\n");
        } else {
            round: while (true) {
                var play = await rlp.questionAsync(`Dealer: ${dealerHand[0].description}.\nPlayer: ${playerHand.map((card) => { return card.description }).join(", ")}\n[hit/stand]`);
                if (play === "hit") {
                    var drawnCard = drawCard();
                    playerHand.push(drawnCard);
                    process.stdout.write(`Drew ${drawnCard.description}.\n`);
                    acesLowValue += drawnCard.acesLowValue;
                    if (drawnCard.isAce) {
                        acesCount++;
                    }

                    if (acesLowValue > 21) {
                        process.stdout.write("Busted.\n");
                        break round;;
                    }

                    if (acesLowValue == 21 || (acesLowValue == 11 && acesCount >= 1)) {
                        process.stdout.write("Blackjack!\n");
                        break round;
                    }
                } else if (play === "stand") {
                    break round;
                }
            }
        }

        var dealerAcesLowValue = dealerHand[0].acesLowValue + dealerHand[1].acesLowValue;
        var dealerAces = 0;
        if (dealerHand[0].isAce) {
            dealerAces++;
        }

        if (dealerHand[1].isAce) {
            dealerAces++;
        }

        if (acesLowValue <= 21) {
            process.stdout.write("Dealer hand: \n");
            process.stdout.write(`${dealerHand[0].description}\n`);
            process.stdout.write(`${dealerHand[1].description}\n`);

            dealer: while (true) {
                if (dealerAcesLowValue >= 17 || (dealerAcesLowValue > 7 && dealerAces >= 1)) {
                    break dealer;
                }

                var drawnCard = drawCard();
                dealerHand.push(drawnCard);
                process.stdout.write(`Drew ${drawnCard.description}\n`);
                dealerAcesLowValue += drawnCard.acesLowValue;
                if (drawnCard.isAce) {
                    dealerAces++;
                }
                if (dealerAcesLowValue > 21) {
                    process.stdout.write(`Dealer busted.\n`);
                    break dealer;
                }
                if (dealerAcesLowValue === 21 || (dealerAcesLowValue === 11 && dealerAces >= 1)) {
                    process.stdout.write(`Dealer blackjack!\n`);
                }
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

        var bust = false;

        if ((dealerValue > 21) && (playerValue > 21)) {
            process.stdout.write("No winners, both busted.\n");
            bust = true;
        }

        if ((dealerValue > 21) && (playerValue <= 21)) {
            process.stdout.write("Player win, dealer busted.\n");
            bust = true;
        }

        if ((dealerValue <= 21) && (playerValue > 21)) {
            process.stdout.write("Dealer win, player busted.\n");
            bust = true;
        }

        if (!bust && dealerValue > playerValue) {
            process.stdout.write(`Dealer wins: ${dealerValue} > ${playerValue}.\n`);
        }

        if (!bust && dealerValue < playerValue) {
            process.stdout.write(`Player wins: ${dealerValue} < ${playerValue}\n`);
        }

        if (!bust && dealerValue == playerValue) {
            process.stdout.write(`Draw: ${dealerValue} == ${playerValue}\n`);
        }

        discardPile.push(...playerHand, ...dealerHand);
    }
})();