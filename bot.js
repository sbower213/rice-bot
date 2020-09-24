// Run dotenv
require('dotenv').config();
const fs = require('fs')
var _ = require('lodash');

const Discord = require('discord.js');
const { stringify } = require('querystring');
const { min } = require('lodash');
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
}

let bids = {}

let prizes = {}

// may need a method to update this usermap if the server gets more members
// use file read/write?
// probably do that for scoreboard as well
// let idToUserMapData = fs.readFileSync('users.json')
// let idToUserMap = JSON.parse(idToUserMapData)

let idToUserMap = {};
let userToIdMap = {};

function objectFlip(obj) {
    const ret = {};
    Object.keys(obj).forEach(key => {
      ret[obj[key]] = key;
    });
    return ret;
}

//let userToIdMap = objectFlip(idToUserMap)

const PREFIX = "!rice "

// todo: instead of having read/writes everywhere
// listen for when js object changes and only write then

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`)
    let testChannel = client.channels.cache.get(process.env.TEST_CHANNEL_ID)

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
            // fs.writeFile('./auction.json', JSON.stringify(auction), function(err, result) {
            //     if (err) {
            //         console.log('error', err);
            //         testChannel.send('Error writing `auction.json`. Check logs for details.')
            //     }
            // })
            saveJsonToFile(auction, './auction.json', testChannel)
        }
    } else {
        auction = {
            auctionInProgress: false
        }
        saveJsonToFile(auction, './auction.json', testChannel)
    }

    if (!fs.existsSync('./bids.json') || !auction.inProgress) {
        saveJsonToFile({}, './bids.json', testChannel)
    } else {
        let bidsData = fs.readFileSync('./bids.json')
        try {
            bids = JSON.parse(bidsData)
        } catch (e) {
            console.log(e)
            console.log("Error reading from bids.json, initializing with empty JSON.")

            bids = {}
            fs.renameSync('./bids.json', './bids.json-' + Date.now())
            // fs.writeFile('./bids.json', JSON.stringify(bids), function(err, result) {
            //     if (err) {
            //         console.log('error', err);
            //         testChannel.send('Error writing `bids.json`. Check logs for details.')
            //     }
            // })
            saveJsonToFile(bids, './bids.json', testChannel)
        }
    }

    if(!fs.existsSync('./prizes.json')) {
        saveJsonToFile({}, './prizes.json', testChannel)
    } else {
        prizesData = fs.readFileSync('./prizes.json')
        try {
            prizes = JSON.parse(prizesData)
        } catch(e) {
            console.log(e)
            console.log("Error parsing prizes.json, initializing with empty json.")
            prizes = {}
            fs.renameSync('./prizes.json', './prizes.json-' + Date.now())
            // fs.writeFile('./prizes.json', JSON.stringify(prizes), function(err, result) {
            //     if (err) {
            //         console.log('error', err);
            //         testChannel.send('Error writing `prizes.json`. Check logs for details.')
            //     }
            // })
            saveJsonToFile(prizes, './prizes.json', testChannel)
        }
    }

    if(!fs.existsSync('./scoreboard.json')) {
        saveJsonToFile({}, './scoreboard.json', testChannel)
    } else {
        scoreboardData = fs.readFileSync('./scoreboard.json')
        try {
            scoreboard = JSON.parse(scoreboardData)
        } catch(e) {
            console.log(e)
            console.log("Error parsing scoreboard.json, initializing with empty json.")
            scoreboard = {}
            fs.renameSync('./scoreboard.json', './scoreboard.json-' + Date.now())
            // fs.writeFile('./scoreboard.json', JSON.stringify(scoreboard), function(err, result) {
            //     if (err) {
            //         console.log('error', err);
            //         testChannel.send('Error writing `scoreboard.json`. Check logs for details.')
            //     }
            // })
            saveJsonToFile(scoreboard, './scoreboard.json', testChannel)
        }
    }

    if (fs.existsSync('./users.json')) {
        usersData = fs.readFileSync('./users.json')
        try {
            idToUserMap = JSON.parse(usersData)
            userToIdMap = objectFlip(idToUserMap)
        } catch(e) {
            console.log(e)
            console.log("Error parsing users.json, initializing with blank JSON.")
            idToUserMap = {}
            userToIdMap = {}
            fs.renameSync('./users.json', './users.json-' + Date.now())
            // fs.writeFile('./users.json', JSON.stringify(idToUserMap), function(err, result) {
            //     if (err) {
            //         console.log('error', err);
            //         testChannel.send('Error writing `users.json`. Check logs for details.')
            //     }
            // })
            saveJsonToFile(idToUserMap, './users.json', testChannel)
        }
    } else {
        saveJsonToFile({}, './users.json', testChannel)
    }

    thotServer = client.guilds.cache.get(process.env.SERVER_ID)
    // map of user ids to user object
    thots = client.users.cache
    console.log(thots)
    let roll = '';
    thots.forEach(function(user, userId) {
        roll += userId + ' - ' + user.username + '\n';
    })
    console.log(roll)
    console.log(userToIdMap)
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

function saveJsonToFile(object, filename, channel) {
    fs.writeFile(filename, JSON.stringify(object), function(err, result) {
        if (err) {
            console.log('error', err);
            channel.send('Error writing `' + filename + '`. Check logs for details.')
        }
    })
}

client.on('message', msg => {
    if (msg.content.toLowerCase() === 'ping') {
        console.log(msg.author.id)
        msg.reply('fuck off, ' + idToUserMap[msg.author.id]);
    }

    if (msg.content.substring(0, PREFIX.length).toLowerCase() == PREFIX) {
        let args = msg.content.substring(PREFIX.length).split(" ")
        console.log(args)
        switch(args[0].toLowerCase()) {
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
                let scoreboardData = fs.readFileSync('./scoreboard.json')
                scoreboard = JSON.parse(scoreboardData)
                const sortedScoreboard = sortByValue(scoreboard)

                let scoreMessage = '';
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
                                'itemName': name,
                                'auctioneer': idToUserMap[msg.author.id]
                            }
                            console.log(auction)
                            // fs.writeFile('./auction.json', JSON.stringify(auction), function(err, result) {
                            //     if (err) {
                            //         console.log('error', err);
                            //         msg.channel.send('Error writing `auction.json`. Check logs for details.')
                            //     }
                            // })
                            saveJsonToFile(auction, './auction.json', msg.channel)
                            msg.channel.send(auction.auctioneer + " started a new auction for " + name)
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
                // prize inventory, and update the scoreboard. the command should also
        // todo: prevent duplicate bid amounts in a given round
        // todo: if this is the last user left, also end the auction + update scoreboard/channel desc
                if (auction.auctionInProgress) {
                    if (args.length < 2) {
                        msg.channel.send('Error making bid: Invalid input.\n'
                            + 'Usage: `!rice bid <bid amount>`')
                    }
                    if (auction.auctioneer == idToUserMap[msg.author.id]) {
                        msg.channel.send('Error making bid: Auctioneer cannot bid for their own item.')
                    } else {
                        let bid = args[1]
                        if (bid.charAt(0) == '$') {
                            bid = bid.substring(1)
                        }
                        if (isNaN(bid)) {
                            msg.channel.send('Error making bid: Invalid input.\n'
                                + 'Usage: `!rice bid <bid amount>`')
                        } else {
                            // let bidsData = fs.readFileSync('./bids.json')
                            // bids = JSON.parse(bidsData)
                            const bidder = idToUserMap[msg.author.id]
                            if (bids[bidder] == null) {
                                bids[bidder] = bid;
                                // fs.writeFile('./bids.json', JSON.stringify(bids), function(err, result) {
                                //     if (err) {
                                //         console.log('error', err);
                                //         msg.channel.send('Error writing `bids.json`. Check logs for details.')
                                //     }
                                // })
                                saveJsonToFile(bids, './bids.json', msg.channel)
                                msg.channel.send(bidder + " bids $" + bid)
                            } else {
                                msg.channel.send(bidder + " has already bid $" + bids[bidder] + " for this auction.")
                            }
                        }
                    }
                } else {
                    msg.channel.send('Error making bid: No auction in progress.')
                }
                break;
            case 'bids':
                // display list of bids + name of current auction item
                break;
            case 'prizes':
                // [(optional) user] - list of prizes a user has won.
                // can pass either name or tag thanks to our handy id-name jsons
                // displays prizes of person who used the command if no user is passed
                let name;
                if (args[1]) {
                    name = getNameFromMention(args[1])
                    if (name == null) {
                        name = args[1]
                    }
                } else {
                    name = idToUserMap[msg.author.id]
                }
                
                if (name == null) {
                    msg.channel.send("Cannot determine name parameter.")
                    break;
                }

                // name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

                // prizesData = fs.readFileSync('./prizes.json')
                // try {
                    // prizes = JSON.parse(prizesData)
                    const prizeList = prizes[name]

                    if (prizeList == null) {
                        msg.channel.send("No prizes found.")
                        break;
                    }

                    let messageText = '';
                    for (let i=0; i < prizeList.length; i++) {
                        messageText += "\n" + prizeList[i]
                    }
                    msg.channel.send(name + "'s Prizes:" + messageText)
                // } catch (e) {
                    // console.log(e)
                    // msg.channel.send('Error reading `prizes.json`. Check logs for details.')
                // }
                break;
            case 'ping':
                // pings opted-in users who haven't voted this round
                let role = msg.guild.roles.cache.find(r => r.name === "ricer");
                let ricerIds = role.members.map(m => m.user.id)
                let pingText = 'Pinging';
                for (let ricerId of ricerIds) {
                    let ricerName = idToUserMap[ricerId]
                    if (auction.auctioneer != ricerName && bids[ricerName] == null) {
                        pingText += ' <@' + ricerId + '>'
                    }
                }
                pingText += ', come get y\'all\'s rice!'
                msg.channel.send(pingText)
                break;
            case 'optout':
                // user will no longer receive notifications from /ping and will be ignored
                // from how /bid determines if everyone voted.
                // (basically just remove ricer role)
                break;
            case 'optin':
                // assign ricer role and add name to users.json + scoreboard
                // alert if name already exists or if user is already playing
                if (args.length < 3) {
                    msg.channel.send('Error: Invalid input.\n'
                        + 'Usage: `!rice optin <@username> <nickname>`')
                    break;
                }

                let member = msg.mentions.members.first();
                if (member == null) {
                    msg.channel.send('Error: Please tag the user you are updating.\n'
                    + 'Usage: `!rice optin <@username> <nickname>`')
                    break;
                }

                let nickname = '';
                for (let i = 2; i < args.length - 1; i++) {
                    nickname += args[i] + " "
                }
                nickname += args[args.length-1]
                nickname = nickname.trim()

                if (userToIdMap[nickname] != null) {
                    msg.channel.send('Error: Nickname already in use.')
                    break;
                }

                let existingName = getNameFromMention(args[1])
                if (existingName != null) {
                    // user is in users.json, replace old name with new one everywhere
                    if (auction.auctioneer == existingName) {
                        auction.auctioneer == nickname
                        // save auction.json
                        saveJsonToFile(auction, './auction.json', msg.channel)
                    }
                    if (bids[existingName] != null) {
                        bids[nickname] = bids[existingName]
                        delete bids[existingName]
                        // save bids.json
                        saveJsonToFile(bids, './bids.json', msg.channel)
                    }
                    if (userToIdMap[existingName] != null) {
                        userToIdMap[nickname] = userToIdMap[existingName]
                        delete userToIdMap[existingName]
                        idToUserMap = objectFlip(userToIdMap)
                        // save idtousermap to users.json
                        saveJsonToFile(idToUserMap, './users.json', msg.channel)
                    }
                    if (scoreboard[existingName] != null) {
                        scoreboard[nickname] = scoreboard[existingName]
                        delete scoreboard[existingName]
                        // save to scoreboard.json
                        saveJsonToFile(scoreboard, './scoreboard.json', msg.channel)
                    }
                    if (prizes[existingName] != null) {
                        prizes[nickname] = prizes[existingName]
                        delete prizes[existingName]
                        // save to prizes.json
                        saveJsonToFile(prizes, './prizes.json', msg.channel)
                    }
                } else {
                    // add to users list
                    let memberId = member.id
                    idToUserMap[memberId] = nickname
                    userToIdMap = objectFlip(idToUserMap)
                    // save idtousermap to users.json
                    saveJsonToFile(idToUserMap, './users.json', msg.channel)
                }

                member.roles.add(process.env.RICER_ROLE)
                msg.channel.send(nickname + ", come on down! You're the next contestant on... The Price is Rice!")
                break;
            case 'setscore':
                // [user, score] manual score override
                break;
            case 'cancel':
                if (!auction.auctionInProgress) {
                    msg.channel.send("No auction in progress.")
                } else {
                    auction.auctionInProgress = false;
                    saveJsonToFile(auction, './auction.json', msg.channel)
                    msg.channel.send("Auction for " + auction.itemName + " has been cancelled.")
                }
                break;
            case 'end':
            case 'auctionend':
            case 'endauction':
                // force auction to end, even if people haven't voted
                if (!auction.auctionInProgress) {
                    msg.channel.send("No auction in progress.")
                } else {
                    auction.auctionInProgress = false;
                    // fs.writeFile('./auction.json', JSON.stringify(auction), function(err, result) {
                    //     if(err) {
                    //         console.log('error', err);
                    //         msg.channel.send('Error writing `auction.json`. Check logs for details.')
                    //     }
                    // })
                    saveJsonToFile(auction, './auction.json', msg.channel)


                    // let bidsData = fs.readFileSync('./bids.json')
                    // bids = JSON.parse(bidsData)

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

                    // let scoreboardData = fs.readFileSync('./scoreboard.json')
                    // scoreboard = JSON.parse(scoreboardData)
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

                    // fs.writeFile('./scoreboard.json', JSON.stringify(scoreboard), function(err, result) {
                    //     if(err) {
                    //         console.log('error', err);
                    //         msg.channel.send('Error writing `scoreboard.json`. Check logs for details.')
                    //     } 
                    // })
                    saveJsonToFile(scoreboard, './scoreboard.json', msg.channel)

                    // let prizesData = fs.readFileSync('./prizes.json')
                    // prizes = JSON.parse(prizesData)

                    if (winningPrice != -1) {
                        if (prizes[winner] == null) {
                            prizes[winner] = [auction.itemName]
                        } else {
                            prizes[winner].push(auction.itemName)
                        }
                    }

                    // fs.writeFile('./prizes.json', JSON.stringify(prizes), function(err, result) {
                    //     if(err) {
                    //         console.log('error', err);
                    //         msg.channel.send('Error writing `prizes.json`. Check logs for details.')
                    //     } 
                    // })
                    saveJsonToFile(prizes, './prizes.json', msg.channel)

                    // fs.writeFile('./bids.json', JSON.stringify({}), function(err, result) {
                    //     if(err) {
                    //         console.log('error', err);
                    //         msg.channel.send('Error clearing `bids.json`. Check logs for details.')
                    //     } 
                    // })
                    saveJsonToFile({}, './bids.json', msg.channel)

                    msg.channel.send("Auction ended for " + auction.itemName + ".\n"
                    + "The price is $" + auction.price + ".")
                    if (winningPrice == -1) {
                        msg.channel.send("Everyone loses points! GO AGAIN!")
                    } else if (winningPrice == auction.price) {
                        msg.channel.send('Double points for '+ winner + '!!! Enjoy your new ' + auction.itemName + '!')
                    } else {
                        msg.channel.send('Congratulations, '+ winner + '! Enjoy your new ' + auction.itemName + '!')
                    }
                }
                break;
            case 'help':
            default:
                // display command list and args
                msg.channel.send('Possible commands:\n' +
                    '`!rice scoreboard` -- Display the current scores.\n' + 
                    '`!rice auction <price in dollars> <item name>` -- Start an auction for an item.\n' +
                    '`!rice bid <bid amount>` -- Bid for the current item on auction.\n' +
                    '`!rice bids` -- (todo) Display list of bids for the current auction. \n' +
                    '`!rice end` -- End the current auction, and award points to the winner. Interchangeable with `!rice endAuction` and `!rice auctionEnd`.\n' +
                    '`!rice cancel` -- Cancel the current auction without awarding points.\n' +
                    '`!rice prizes <optional: @username or nickname>` -- View a player\'s prizes. Omitting a username will show your own prizes.\n' +
                    '`!rice ping` -- (todo) Ping all ricers who have not voted in the current auction.\n' +
                    '`!rice optin <@username> <nickname>` -- Add a user to the game. You may also use this to update your display name.\n' +
                    '`!rice optout <@username>` -- (todo) Remove a user from the game. Their score and prizes will remain, but they will not be alerted by `ping` commands.\n' +
                    '`!rice setscore <@username or nickname> <score>` -- (todo) Manually set a player\'s score. Use responsibly.\n' +
                    '`!rice help` -- Display the help menu.'
                )
        }
    }
  });

client.login(process.env.DISCORD_TOKEN);