// Run dotenv
require('dotenv').config();
const fs = require('fs')
var _ = require('lodash');

const Discord = require('discord.js');
const client = new Discord.Client();
let thotServer;
let thots;

/* auction json format: 
    {
        inProgress: boolean,
        price: int/float,
        itemName: String,
        auctioneer: String
    }

    inProgress is probably redundant, just set to null when auction ends?
    also write to file in case bot goes down, then read on app startup / write on auction end
*/
let auction = {
    inProgress: false
};

// may need a method to update this usermap if the server gets more members
// use file read/write?
// probably do that for scoreboard as well
const idToUserMapData = fs.readFileSync('users.json')
const idToUserMap = JSON.parse(idToUserMapData)

function objectFlip(obj) {
    const ret = {};
    Object.keys(obj).forEach(key => {
      ret[obj[key]] = key;
    });
    return ret;
}

const userToIdMap = objectFlip(idToUserMap)

const PREFIX = "!rice "

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    thotServer = client.guilds.cache.get('641103933795729439')
    // map of user ids to user object
    thots = client.users.cache
    console.log(thots)
    let roll = '';
    thots.forEach(function(user, userId) {
        roll += userId + ' - ' + user.username + '\n';
    })
    console.log(roll)
    console.log(userToIdMap)
    // map of snowflake to member object
    // use function(guildMember, snowflake) callbacks to get guildMember object
    // which you can then use guildMember.user.username, etc.
    // PLEASE just use client.users.cache. 
    // oldthots = thotServer.members.cache

    // set up necessary files
    if (fs.existsSync('./auction.json')) {
        auctionData = fs.readFileSync('./auction.json')
        try {
            auction = JSON.parse(auctionData)
        } catch(e) {
            console.log(e)
            console.log("Error parsing auction.json, initializing with blank auction.")
            auction = {
                auctionInProgress: false
            }
            fs.renameSync('./auction.json', './auction.json-' + Date.now())
            fs.writeFile('./auction.json', JSON.stringify(auction), function(err, result) {
                if (err) {
                    console.log('error', err);
                    msg.channel.send('Error writing `auction.json`. Check logs for details.')
                }
            })
        }
    } else {
        auction = {
            auctionInProgress: false
        }
    }

    if (!fs.existsSync('./bids.json') || !auction.inProgress) {
        fs.writeFile('./bids.json', JSON.stringify({}), function(err, result) {
            if(err) {
                console.log('error', err);
            }
        })
    }

    if(!fs.existsSync('./prizes.json')) {
        fs.writeFile('./prizes.json', JSON.stringify({}), function(err, result) {
            if(err) {
                console.log('error', err);
            }
        })
    } else {
        prizesData = fs.readFileSync('./prizes.json')
        try {
            prizes = JSON.parse(prizesData)
        } catch(e) {
            console.log(e)
            console.log("Error parsing prizes.json, initializing with empty json.")
            fs.renameSync('./prizes.json', './prizes.json-' + Date.now())
            fs.writeFile('./prizes.json', JSON.stringify({}), function(err, result) {
                if (err) {
                    console.log('error', err);
                    msg.channel.send('Error writing `prizes.json`. Check logs for details.')
                }
            })
        }
    }

    if(!fs.existsSync('./scoreboard.json')) {
        fs.writeFile('./scoreboard.json', JSON.stringify({}), function(err, result) {
            if(err) {
                console.log('error', err);
            }
        })
    } else {
        scoreboardData = fs.readFileSync('./scoreboard.json')
        try {
            scoreboard = JSON.parse(scoreboardData)
        } catch(e) {
            console.log(e)
            console.log("Error parsing scoreboard.json, initializing with empty json.")
            fs.renameSync('./scoreboard.json', './scoreboard.json-' + Date.now())
            fs.writeFile('./scoreboard.json', JSON.stringify({}), function(err, result) {
                if (err) {
                    console.log('error', err);
                    msg.channel.send('Error writing `prizes.json`. Check logs for details.')
                }
            })
        }
    }
});

function getUserFromMention(mention) {
	if (!mention) return;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}

		return thots.get(mention);
	}
}

function getNameFromMention(mention) {
	if (!mention) return;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}

		return idToUserMap[mention]
	}
}

function sortByValue(jsObj){
    var sortedArray = [];
    for(var i in jsObj)
    {
        // Push each JSON Object entry in array by [value, key]
        sortedArray.push([jsObj[i], i]);
    }
    return sortedArray.sort(([a, b], [c, d]) => c - a);
}

client.on('message', msg => {
    if (msg.content === 'ping') {
        console.log(msg.author.id)
        msg.reply('fuck off, ' + idToUserMap[msg.author.id]);
    }

    // msg.delete() to delete message
    if (msg.content.substring(0, PREFIX.length) == PREFIX) {
        let args = msg.content.substring(PREFIX.length).split(" ")
        console.log(args)
        switch(args[0]) {
            case 'rollcall':
                let roll = '';
                // const thots = thotServer.members.cache
                // thots.forEach(function(guildMember, guildMemberId) {
                //     roll += guildMemberId + ' - ' + guildMember.user.username + '\n';
                // })
                thots.forEach(function(user, userId) {
                    roll += userId + ' - ' + user.username + '\n';
                })
                msg.channel.send(roll)
                break;
            case 'whois':
                if (args[1]) {
                    //const user = getUserFromMention(args[1])
                    const name = getNameFromMention(args[1])
                    msg.channel.send('That\'s ' + name + '!')
                }
                break;

            /* actual functionality */
            case 'scoreboard':
                // display scoreboard, sorted from most points to least
                // probably use lodash/underscore or smth
                let scoreboardData = fs.readFileSync('./scoreboard.json')
                scoreboard = JSON.parse(scoreboardData)
                const sortedScoreboard = sortByValue(scoreboard)
                let scoreMessage = '';
                // for(const [score, name] of sortedScoreboard) {
                //     scoreMessage += name + ": " + score + "\n"
                // }
                for(var i=0; i<sortedScoreboard.length; i++) {
                    scoreMessage += sortedScoreboard[i][1] + ": " + sortedScoreboard[i][0] + "\n"
                }
                msg.channel.send(scoreMessage)
                break;
            case 'auction':
                // [price, name] - use to start a new round of rice bidding for an object named [name],
                // intended to be called after posting a new item's image
                // deletes the calling message and replaces with bot message (hides price)
                // make sure it can't be called while another auction is in progress
                if (!auction.auctionInProgress) {
                    if (args.length <= 2) {
                        msg.channel.send("Error starting auction: Invalid input.\n"
                            + "Usage: `!rice auction <price in dollars> <item name>`")
                    } else {
                        let price = args[1]
                        let name = ''
                        if (price.charAt(0) == '$') {
                            price = price.substring(1)
                        }
                        if (isNaN(price)) {
                            msg.channel.send("Error starting auction: Invalid input.\n"
                                + "Usage: `!rice auction <price in dollars> <item name>`")
                        } else {
                            for (i = 2; i < args.length - 1; i++) {
                                name += args[i] + " "
                            }
                            name += args[args.length - 1]
                            auction = {
                                'auctionInProgress': true,
                                'price': price,
                                'itemName': name
                            }
                            console.log(auction)
                            fs.writeFile('./auction.json', JSON.stringify(auction), function(err, result) {
                                if (err) {
                                    console.log('error', err);
                                    msg.channel.send('Error writing `auction.json`. Check logs for details.')
                                }
                            })
                            msg.channel.send("New auction started for " + name)
                        }
                    }
                } else {
                    msg.channel.send("Error starting auction: Auction already in progress.")
                }
                msg.delete()
                break;
            case 'bid':
                // [number] - self-explanatory. once the last person calls bid the bot will
                // automatically end the round, ping the winner, add the item to the winner's
                // prize inventory, and update the scoreboard. the command should also prevent
                // duplicate bid amounts in a given round, as well as multiple bids from the same user
                // if this is the last user left, also end the auction + update scoreboard/channel desc
                if (auction.auctionInProgress) {
                    if (args.length < 2) {
                        msg.channel.send('Error making bid: Invalid input.\n'
                            + 'Usage: `!rice bid <bid amount>`')
                    }
                    let bid = args[1]
                    if (bid.charAt(0) == '$') {
                        bid = bid.substring(1)
                    }
                    if (isNaN(bid)) {
                        msg.channel.send('Error making bid: Invalid input.\n'
                            + 'Usage: `!rice bid <bid amount>`')
                    } else {
                        let bidsData = fs.readFileSync('./bids.json')
                        bids = JSON.parse(bidsData)
                        const bidder = idToUserMap[msg.author.id]
                        if (bids[bidder] ==  null) {
                            bids[bidder] = bid;
                            fs.writeFile('./bids.json', JSON.stringify(bids), function(err, result) {
                                if (err) {
                                    console.log('error', err);
                                    msg.channel.send('Error writing `bids.json`. Check logs for details.')
                                }
                            })
                            msg.channel.send(bidder + " bids $" + bid)
                        } else {
                            msg.channel.send(bidder + " has already bid $" + bids[bidder] + " for this auction.")
                        }
                    }
                } else {
                    msg.channel.send('Error making bid: No auction in progress.')
                }
    // todo: don't let the person who created the auction bid
                break;
            case 'prizes':
                // [(optional) user] - list of prizes a user has won.
                // can pass either name or tag thanks to our handy id-name jsons
                // displays prizes of person who used the command if no user is passed
                break;
            case 'ping':
                // pings opted-in users who haven't voted this round
                break;
            case 'optout':
                // user will no longer receive notifications from /ping and will be ignored
                // from how /bid determines if everyone voted.
                // (basically just remove ricer role)
                break;
            case 'optin':
                // assign ricer role
                break;
            case 'help':
                // display command list and args
                break;
            case 'setScore':
                // [user, score] manual score override
                break;
            case 'endAuction':
                // [shouldUpdateScore]
                // force auction to end, even if people haven't voted
        //todo: requires boolean to be passed for whether or not scores should be updated 
                if (!auction.auctionInProgress) {
                    msg.channel.send("No auction in progress.")
                } else {
                    auction.auctionInProgress = false;
                    fs.writeFile('./auction.json', JSON.stringify(auction), function(err, result) {
                        if(err) {
                            console.log('error', err);
                            msg.channel.send('Error writing `auction.json`. Check logs for details.')
                        }
                    })

                    let bidsData = fs.readFileSync('./bids.json')
                    bids = JSON.parse(bidsData)
                    
                    // const bidsEntries = Object.entries(bids);
                    // const bidArray = []
                    // for (const [key, value] of bidsEntries) {
                    //     bidArray.push({"bidder": key, "bid": value})
                    // }

                    // _.find(bidArray, function())
                    const losePoints = []
                    let winner;
                    let winningPrice = -1;

                    for (const [key, value] of Object.entries(bids)) {
                        // if they bid above the price, lose points
                        if (value > auction.price) {
                            losePoints.push(key)
                        } else {
                            if (value > winningPrice) {
                                // otherwise, pick the highest bid under the value
                                winner = key
                                winningPrice = value
                            }
                        }
                    }

                    let scoreboardData = fs.readFileSync('./scoreboard.json')
                    scoreboard = JSON.parse(scoreboardData)
                    for (const name of losePoints) {
                        if (scoreboard[name] == null) {
                            scoreboard[name] = -1
                        } else {
                            scoreboard[name] = scoreboard[name] - 1
                        }
                    }

                    if (winningPrice != -1) {
                        if (winningPrice == auction.price) {
                            scoreboard[winner] += 2
                        } else {
                            scoreboard[winner] += 1
                        }
                    }

                    fs.writeFile('./scoreboard.json', JSON.stringify(scoreboard), function(err, result) {
                        if(err) {
                            console.log('error', err);
                            msg.channel.send('Error writing `scoreboard.json`. Check logs for details.')
                        } 
                    })

                    let prizesData = fs.readFileSync('./prizes.json')
                    prizes = JSON.parse(prizesData)

                    if (winningPrice != -1) {
                        if (prizes[winner] == null) {
                            prizes[winner] = [auction.itemName]
                        } else {
                            prizes[winner].push(auction.itemName)
                        }
                    }

                    fs.writeFile('./prizes.json', JSON.stringify(prizes), function(err, result) {
                        if(err) {
                            console.log('error', err);
                            msg.channel.send('Error writing `prizes.json`. Check logs for details.')
                        } 
                    })

                    fs.writeFile('./bids.json', JSON.stringify({}), function(err, result) {
                        if(err) {
                            console.log('error', err);
                            msg.channel.send('Error clearing `bids.json`. Check logs for details.')
                        } 
                    })
                    msg.channel.send("Auction ended for " + auction.itemName + ".\n"
                    + "The price is $" + auction.price + ".")
                    if (winningPrice == -1) {
                        msg.channel.send("Y'all are a bunch of dumbfucks. GO AGAIN!")
                    } else {
                        msg.channel.send('Congratulations, '+ winner + '! Enjoy your new ' + auction.itemName + '!')
                    }
                }
                break;
            case 'addBidder':
                // !rice addBidder username name to keep names json updated
                // should this just be used as opt-in?
                // how to update names for existing bidders if desired
                break;
        }
    }
  });

client.login(process.env.DISCORD_TOKEN);