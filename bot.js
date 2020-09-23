// Run dotenv
require('dotenv').config();
const fs = require('fs')

const Discord = require('discord.js');
const client = new Discord.Client();
let thotServer;
let thots;

/* auction json format: 
    {
        inProgress: boolean,
        price: int/float,
        itemName: String
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
        auction = JSON.parse(auctionData)
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

client.on('message', msg => {
    if (msg.content === 'ping') {
        console.log(msg.userId)
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
                    const bid = args[1]
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
                        bids[bidder] = bid;
                        fs.writeFile('./bids.json', JSON.stringify(bids), function(err, result) {
                            if (err) {
                                console.log('error', err);
                                msg.channel.send('Error writing `bids.json`. Check logs for details.')
                            }
                        })
                        msg.channel.send(bidder + " bids $" + bid)
                    }
                } else {
                    msg.channel.send('Error making bid: No auction in progress.')
                }
                break;
            case 'prizes':
                // [(optional) user] - list of prizes a user has won.
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
                // requires boolean to be passed for whether or not scores should be updated 
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
                    fs.writeFile('./bids.json', JSON.stringify({}), function(err, result) {
                        if(err) {
                            console.log('error', err);
                            msg.channel.send('Error clearing `bids.json`. Check logs for details.')
                        } 
                    })
                    msg.channel.send("Auction ended for " + auction.itemName + ".\n"
                    + "The price is $" + auction.price)
                }
                break;
        }
    }
  });

client.login(process.env.DISCORD_TOKEN);