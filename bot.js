// Run dotenv
require('dotenv').config();
const fs = require('fs')

const Discord = require('discord.js');
const { stringify } = require('querystring');
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
let idToUserMap = {};
let userToIdMap = {};

function objectFlip(obj) {
    const ret = {};
    Object.keys(obj).forEach(key => {
      ret[obj[key]] = key;
    });
    return ret;
}

const PREFIX = "!rice "

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

function updateName(member, existingName, nickname, msg) {
    if (existingName != nickname) {
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
    }
}

function getLoserMessage(itemName) {
    const loserMessages = [
        'I can\'t believe it\'s not ' + itemName + '. Everybody loses points!',
        'Everybody overbid! Nobody gets ' + itemName + ' and everyone loses points!',
        itemName + ' gets thrown into the rice machine! ' +
        'It\'s lose points o\'clock, gamers!' +
        'kinda cringe bids on this one :/' + 
        'Say goodbye to ' + itemName + ', and to your points!',
        'Everyone loses points. Go again!'
    ]
    return loserMessages[Math.floor(Math.random() * loserMessages.length)]
}

function getWinnerMessage(winner, itemName) {
    const winnerMessages = [
        'Congratulations, '+ winner + '! Enjoy your new ' + itemName + '!',
        winner + ' is the proud owner of a new ' + itemName + '!',
        winner + '\'s price gets all the rice!',
        'And the winner is... ' + winner + '!',
        'A round of applause for ' + winner + ' and their brand new ' + itemName + '!',
        'Congrats on the new ' + itemName + ', ' + winner + '!',
        winner + '! A new ' + itemName + ' is now yours!',
        'A winner is you! Enjoy the ' + itemName + ', ' + winner + '!',
        itemName + ' rice goes to ' + winner + '!'
    ]
    return winnerMessages[Math.floor(Math.random() * winnerMessages.length)]
}

function getDoubleWinnerMessage(winner, itemName) {
    const winnerMessages = [
        'Double points for '+ winner + '!!! Enjoy your new ' + itemName + '!',
        'Ding ding ding! Two points for ' + winner + '\'s perfect guess!',
        winner + ' gets two points and a new ' + itemName + '!'
    ]
    return winnerMessages[Math.floor(Math.random() * winnerMessages.length)]
}

client.on('message', msg => {
    if (msg.content.toLowerCase() === 'ping') {
        console.log(msg.author.id)
        msg.reply('fuck off, ' + idToUserMap[msg.author.id]);
    }

    function endAuction() {
        // force auction to end, even if people haven't voted
        if (!auction.auctionInProgress) {
            msg.channel.send("No auction in progress.")
        } else {
            auction.auctionInProgress = false;
            saveJsonToFile(auction, './auction.json', msg.channel)

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

            for (const name of losePoints) {
                if (scoreboard[name] == null) {
                    scoreboard[name] = -1
                } else {
                    scoreboard[name] = scoreboard[name] - 1
                }
            }

            if (winningPrice != -1) {
                if(scoreboard[winner] == null) {
                    scoreboard[winner] = 0
                }
                if (winningPrice == auction.price) {
                    scoreboard[winner] += 2
                } else {
                    scoreboard[winner] += 1
                }
            }
            saveJsonToFile(scoreboard, './scoreboard.json', msg.channel)

            if (winningPrice != -1) {
                if (prizes[winner] == null) {
                    prizes[winner] = [auction.itemName]
                } else {
                    prizes[winner].push(auction.itemName)
                }
            }
            saveJsonToFile(prizes, './prizes.json', msg.channel)

            saveJsonToFile({}, './bids.json', msg.channel)

            msg.channel.send("Auction ended for " + auction.itemName + '. '
            + "The price is $" + auction.price + "!")
            
            if (Object.entries(bids).length == 0) {
                msg.channel.send('No bidders this round, scores left unchanged.')
            } else {
                let nextAuctioneer = ''
                if (winningPrice == -1) {
                    msg.channel.send(getLoserMessage(auction.itemName))
                    nextAuctioneer = auction.auctioneer
                } else if (winningPrice == auction.price) {
                    msg.channel.send(getDoubleWinnerMessage(auction.itemName))
                    nextAuctioneer = winner
                } else {
                    msg.channel.send(getWinnerMessage(auction.itemName))
                    nextAuctioneer = winner
                }
                if (winner != null) {
                    msg.channel.send('<@' + userToIdMap[winner] + '>, it\'s your turn to rice!')
                }
            }
        }
    }

    let role = msg.guild.roles.cache.get(process.env.RICER_ROLE);
    let ricerIds = role.members.map(m => m.user.id)

    if (msg.content.substring(0, PREFIX.length).toLowerCase() == PREFIX) {
        let args = msg.content.substring(PREFIX.length).split(" ")
        console.log(args)
        switch(args[0].toLowerCase()) {
            case 'rollcall':
                let roll = '';
                thots.forEach(function(user, userId) {
                    roll += userId + ' - ' + user.username + '\n';
                })
                msg.channel.send(roll)
                break;
            case 'whois':
                if (args[1]) {
                    const name = getNameFromMention(args[1])
                    msg.channel.send('That\'s ' + name + '!')
                }
                break;

            /* actual functionality */
            case 'points':
            case 'score':
            case 'scores':
            case 'scoreboard':
                // display scoreboard, sorted from most points to least
                const sortedScoreboard = sortByValue(scoreboard)

                let scoreMessage = '';
                if (args[1] == 'all') {
                    for(var i=0; i<sortedScoreboard.length; i++) {
                        let scoreboardName = sortedScoreboard[i][1]
                        let scoreboardScore = sortedScoreboard[i][0]
                        scoreMessage += scoreboardName + ": " + scoreboardScore + "\n"
                    }
                } else {
                    for(var i=0; i<sortedScoreboard.length; i++) {
                        let scoreboardName = sortedScoreboard[i][1]
                        let scoreboardScore = sortedScoreboard[i][0]
                        if (ricerIds.includes(userToIdMap[scoreboardName])) {
                            scoreMessage += scoreboardName + ": " + scoreboardScore + "\n"
                        }
                    }
                }
                if (scoreMessage == '') {
                    msg.channel.send('No scores to report.')
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
                            for (i = 2; i < args.length; i++) {
                                name += args[i] + " "
                            }
                            name = name.trim()
                            auction = {
                                'auctionInProgress': true,
                                'price': price,
                                'itemName': name,
                                'auctioneer': idToUserMap[msg.author.id]
                            }
                            console.log(auction)
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
                // prevent duplicate bids. if this is the last user left, also end
                // the auction + update scoreboard/channel description.
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
                            // catch duplicate bid amounts
                            let bidValues = Object.values(bids)
                            let dupeBidIndex = bidValues.indexOf(bid)
                            if (dupeBidIndex >= 0) {
                                msg.channel.send('Error: ' + Object.keys(bids)[dupeBidIndex] + ' already bid $' + bid + '. No doubles!')
                                break;
                            }

                            const bidder = idToUserMap[msg.author.id]
                            if (bids[bidder] == null) {
                                bids[bidder] = bid;
                                saveJsonToFile(bids, './bids.json', msg.channel)
                                msg.channel.send(bidder + " bids $" + bid)
                            } else {
                                msg.channel.send(bidder + " has already bid $" + bids[bidder] + " for this auction.")
                                break;
                            }

                            // if this is the last bid, end the auction
                            // minus 1 for auctioneer, minus 1 for current bidder
                            if (bidValues.length == ricerIds.length - 2) {
                                endAuction()
                            }
                        }
                    }
                } else {
                    msg.channel.send('Error making bid: No auction in progress.')
                }
                break;
            case 'bids':
                // display list of bids (ascending) + name of current auction item
                if (auction.auctionInProgress) {
                    let bidsMessage = 'Bids for ' + auction.auctioneer + '\'s ' + auction.itemName + ':\n'
                    let sortedBids = sortByValue(bids)

                    for(var i=0; i<sortedBids.length; i++) {
                        bidsMessage += sortedBids[i][1] + ": " + sortedBids[i][0] + "\n"
                    }

                    bidsMessage += 'Haven\'t bid yet: '
                    for (let ricerId of ricerIds) {
                        let ricer = idToUserMap[ricerId]
                        if (bids[ricer] == null && auction.auctioneer != ricer) {
                            bidsMessage += ricer + ' '
                        }
                    }
                    msg.channel.send(bidsMessage)
                } else {
                    msg.channel.send('Error: No auction in progress; no bids to show.')
                }
                break;
            case 'prize':
            case 'prizes':
                // [(optional) user] - list of prizes a user has won.
                // can pass either name or tag thanks to our handy id-name jsons
                // displays prizes of person who used the command if no user is passed
                let name;
                if (args[1]) {
                    name = getNameFromMention(args[1])
                    if (name == null) {
                        name = '';
                        for (let i=1; i < args.length; i++) {
                            name += args[i] + ' '
                        }
                        name = name.trim()
                    }
                } else {
                    name = idToUserMap[msg.author.id]
                }
                
                if (name == null) {
                    msg.channel.send("Cannot determine name parameter.")
                    break;
                }
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
                break;
            case 'ping':
                // pings opted-in users who haven't voted this round
                if (auction.auctionInProgress) {
                    let pingText = 'Pinging';
                    for (let ricerId of ricerIds) {
                        let ricerName = idToUserMap[ricerId]
                        if (auction.auctioneer != ricerName && bids[ricerName] == null) {
                            pingText += ' <@' + ricerId + '>'
                        }
                    }
                    pingText += ', come get y\'all\'s rice!'
                    msg.channel.send(pingText)
                } else {
                    msg.channel.send('Error: No auction in progress, no one to ping.')
                }
                break;
            case 'setname':
                // update name in users.json + scoreboard
                // alert if name already exists
                if (args.length < 3) {
                    msg.channel.send('Error: Invalid input.\n'
                        + 'Usage: `!rice setname <@username> <nickname>`')
                    break;
                }

                let member = msg.mentions.members.first();
                if (member == null) {
                    msg.channel.send('Error: Please tag the user you are updating.\n'
                    + 'Usage: `!rice setname <@username> <nickname>`')
                    break;
                }

                let nickname = '';
                for (let i = 2; i < args.length - 1; i++) {
                    nickname += args[i] + " "
                }
                nickname += args[args.length-1]
                nickname = nickname.trim()

                if (userToIdMap[nickname] != null && userToIdMap[nickname] != member.id) {
                    msg.channel.send('Error: Nickname already in use.')
                    break;
                }

                let existingName = getNameFromMention(args[1])
                updateName(member, existingName, nickname, msg)
                msg.channel.send(existingName + " shall henceforth be known as " + nickname)
                break;
            case 'optout':
                // user will no longer receive notifications from /ping and will be ignored
                // from how /bid determines if everyone voted.
                // (basically just remove ricer role)
                let optOutMember = msg.mentions.members.first();
                if (optOutMember == null) {
                    msg.channel.send('Error: Please tag the user you are opting out.\n'
                    + 'Usage: `!rice optout <@username>`')
                    break;
                }

                optOutMember.roles.remove(process.env.RICER_ROLE)
                msg.channel.send(idToUserMap[optOutMember.id] + " has had enough rice for now.")
                break;
            case 'optin':
                // assign ricer role and add name to users.json + scoreboard
                // alert if name already exists or if user is already playing
                if (args.length < 3) {
                    msg.channel.send('Error: Invalid input.\n'
                        + 'Usage: `!rice optin <@username> <nickname>`')
                    break;
                }

                let optInMember = msg.mentions.members.first();
                if (optInMember == null) {
                    msg.channel.send('Error: Please tag the user you are updating.\n'
                    + 'Usage: `!rice optin <@username> <nickname>`')
                    break;
                }
                if (optInMember.roles.cache.has(process.env.RICER_ROLE)) {
                    msg.channel.send(idToUserMap[optInMember.id] + ' is already playing!')
                    break
                }

                let optInNickname = '';
                for (let i = 2; i < args.length - 1; i++) {
                    optInNickname += args[i] + " "
                }
                optInNickname += args[args.length-1]
                optInNickname = optInNickname.trim()

                if (userToIdMap[optInNickname] != null && userToIdMap[optInNickname] != optInMember.id) {
                    msg.channel.send('Error: Nickname already in use.')
                    break;
                }

                let optInExistingName = getNameFromMention(args[1])

                updateName(optInMember, optInExistingName, optInNickname, msg)

                optInMember.roles.add(process.env.RICER_ROLE)
                msg.channel.send(optInNickname + ", come on down! You're the next contestant on... The Price is Rice!")
                break;
            case 'setscore':
                // [user, score] manual score override
                if (args.length < 3) {
                    msg.channel.send('Error: not enough arguments passed.\n'
                        + 'Usage: `!rice setscore <@username or nickname> <score>`')
                    break;
                }

                let targetName = getNameFromMention(args[1])
                if (targetName == null) {
                    targetName = '';
                    for (let i=1; i < args.length - 1; i++) {
                        targetName += args[i] + ' '
                    }
                    targetName = targetName.trim()
                }

                let testId = userToIdMap[targetName]
                if (testId == null) {
                    msg.channel.send('Error: specified user not found.')
                    break;
                }

                let score = args[args.length - 1]
                if (isNaN(score)) {
                    msg.channel.send('Error: Final argument needs to be a number.')
                    break;
                }

                let oldScore = scoreboard[targetName]
                scoreboard[targetName] = score
                saveJsonToFile(scoreboard, './scoreboard.json', msg.channel)
                
                msg.channel.send(targetName + '\'s score changed from ' + oldScore + ' to ' + score + '.')
                break;
            case 'cancel':
                if (!auction.auctionInProgress) {
                    msg.channel.send("No auction in progress.")
                } else {
                    auction.auctionInProgress = false;
                    saveJsonToFile(auction, './auction.json', msg.channel)
                    bids = {}
                    saveJsonToFile(bids, './bids.json', msg.channel)
                    msg.channel.send("Auction for " + auction.itemName + " has been cancelled.")
                }
                break;
            case 'end':
            case 'auctionend':
            case 'endauction':
                endAuction()
                break;
            case 'help':
            default:
                // display command list and args
                msg.channel.send('Possible commands:\n' +
                    '`!rice scoreboard` -- Display the scores of current players. Run `!rice scoreboard all` to get scores of all players.\n' + 
                    '`!rice auction <price in dollars> <item name>` -- Start an auction for an item.\n' +
                    '`!rice bid <bid amount>` -- Bid for the current item on auction.\n' +
                    '`!rice bids` -- Display list of bids for the current auction. \n' +
                    '`!rice end` -- End the current auction, and award points to the winner. Interchangeable with `!rice endAuction` and `!rice auctionEnd`.\n' +
                    '`!rice cancel` -- Cancel the current auction without awarding points.\n' +
                    '`!rice prizes <optional: @username or nickname>` -- View a player\'s prizes. Omitting a username will show your own prizes.\n' +
                    '`!rice ping` -- Ping all ricers who have not voted in the current auction.\n' +
                    '`!rice optin <@username> <nickname>` -- Add a user to the game. You can also use this to update your display name.\n' +
                    '`!rice optout <@username>` -- Remove a user from the game. Their score and prizes will remain, but they will not be alerted by `ping` commands.\n' +
                    '`!rice setname <@username> <nickname>` -- Set a user\'s nickname. They do not have to currently be playing.\n' +
                    '`!rice setscore <@username or nickname> <score>` -- Manually set a player\'s score. Use responsibly.\n' +
                    '`!rice help` -- Display the help menu.'
                )
        }
    }
  });

client.login(process.env.DISCORD_TOKEN);