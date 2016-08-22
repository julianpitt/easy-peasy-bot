/**
 * A Bot for Slack!
 */


/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

function onInstallation(bot, installer) {
    if (installer) {
        bot.startPrivateConversation({user: installer}, function (err, convo) {
            if (err) {
                console.log(err);
            } else {
                convo.say('I am a bot that has just joined your team');
                convo.say('You must now /invite me to a channel so that I can be of use!');
            }
        });
    }
}


/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
} else {
    config = {
        json_file_store: ((process.env.TOKEN)?'./db_slack_bot_ci/':'./db_slack_bot_a/'), //use a different name if an app or CI
    };
}



/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */

if (process.env.TOKEN || process.env.SLACK_TOKEN) {
    //Treat this as a custom integration
    var customIntegration = require('./lib/custom_integrations');
    var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
    var controller = customIntegration.configure(token, config, onInstallation);
} else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT) {
    //Treat this as an app
    var app = require('./lib/apps');
    var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config, onInstallation);
} else {
    console.log('Error: If this is a custom integration, please specify TOKEN in the environment. If this is an app, please specify CLIENTID, CLIENTSECRET, and PORT in the environment');
    process.exit(1);
}


var apiai = require('botkit-middleware-apiai')({
    token: process.env.APIAI_TOKEN
});
controller.middleware.receive.use(apiai.receive);
/**
 * A demonstration for how to handle websocket events. In this case, just log when we have and have not
 * been disconnected from the websocket. In the future, it would be super awesome to be able to specify
 * a reconnect policy, and do reconnections automatically. In the meantime, we aren't going to attempt reconnects,
 * WHICH IS A B0RKED WAY TO HANDLE BEING DISCONNECTED. So we need to fix this.
 *
 * TODO: fixed b0rked reconnect behavior
 */
// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
    console.log('** The RTM api just connected!');
});

controller.on('rtm_close', function (bot) {
    console.log('** The RTM api just closed');
    // you may want to attempt to re-open
});

var responses = [
    'Lol no, you\'re on your own',
    'Maybe if you were a bit nicer before',
    'It\'s better if you figure it out yourself',
    'I\'m just a bot, what do you expect me to do!?'
];

var keywords = ['direct_message', 'mention', 'direct_mention'];
var responseTestFlag = false;
/**
 * Core bot logic goes here!
 */
// BEGIN EDITING HERE!

controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "I'm here!")
});

controller.hears('hello_intent', keywords, apiai.hears, function (bot, message) {
    bot.reply(message, 'Hello!');
    responseTestFlag = true;
});

controller.hears('What you doin?', keywords, function (bot, message) {
    if(responseTestFlag) {
        bot.reply(message, 'Nothin hbu?');
    }
    responseTestFlag = false;
});

controller.hears('smartass', keywords, apiai.hears, function (bot, message) {
    if(message.fulfillment.speech !== '') {
        bot.reply(message, message.fulfillment.speech);
    } else {
        bot.reply(message, responses[Math.floor(Math.random() * 3) ]);
    }
});

controller.hears('bees', keywords, function (bot, message) {
    var user = "<@coderbearbot";
    bot.reply(message, user + " Tell me about the bees"); // wrap around like this to create an @ mention of the user
});

controller.hears(['flights'], 'direct_message', apiai.hears, function (bot, message) {
    if(message.fulfillment.speech !== '') {
        bot.reply(message, message.fulfillment.speech);
    } else {
        bot.reply(message, "You requested to fly to " + message.entities['geo-city'] + " on " + message.entities['date']+".");
    }
});

controller.hears(['spam'], 'message_received', apiai.hears, function (bot, message) {
    if(message.fulfillment.speech !== '') {
        bot.reply(message, message.fulfillment.speech);
    } else {

        var channelID = message.channel;
        var userlist = channel.list;

        users.forEach(function(user, index, arr){
            userlist+="<@"+user+"> ";
        });

        bot.reply(message, userlist);

        bot.reply(message, {
            "attachments": [
                {
                    "fields": [
                        {
                            "short": false
                        }
                    ],
                    "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Spam_can.png/440px-Spam_can.png"
                }
            ]
        });
    }
});

/**
 * AN example of what could be:
 * Any un-handled direct mention gets a reaction and a pat response!
 */
//controller.on('direct_message,mention,direct_mention', function (bot, message) {
//    bot.api.reactions.add({
//        timestamp: message.ts,
//        channel: message.channel,
//        name: 'robot_face',
//    }, function (err) {
//        if (err) {
//            console.log(err)
//        }
//        bot.reply(message, 'I heard you loud and clear boss.');
//    });
//});
