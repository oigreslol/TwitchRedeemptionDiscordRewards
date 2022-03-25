// <------------ IMPORTS ---------------->
const tmi = require('tmi.js');  // This is the twitch library
const { Client, Intents } = require("discord.js"); // This is the Discord Official Library
const dotenv = require('dotenv'); // Environment library to read env variables
const Discord = require("discord-user-bots");
const axios = require('axios'); // HTTP requests library
const { StaticAuthProvider }= require('@twurple/auth');
const { PubSubClient } = require('@twurple/pubsub');

require('azure-app-service-keepalive').keepalive();



// <------------- SET UP ---------->
dotenv.config();


const authProvider = new StaticAuthProvider(process.env.TWITCH_APP_CLIENT_ID, process.env.TWITCH_USER_ACCESS_TOKEN, ['channel:read:redemptions']);

const pubSubClient = new PubSubClient();

const userBotClientDiscord = new Discord.Client(process.env.DISCORD_CHECHO_TOKEN_LOGIN);
const clientDiscordBot = new Client({
    intents : [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ],
    partials: ['MESSAGE', 'CHANNEL', 'USER', 'REACTION']
});

const clientTwitchBot = new tmi.Client({
	options: { debug: true },
	identity: {
		username: process.env.TWITCH_BOT_USERNAME,
		password: process.env.TWITCH_OAUTH_TOKEN
	},
	channels: [ 'SoyElChecho' ]
});

// <------------- LOGIN ---------->

clientDiscordBot.login(process.env.DISCORD_SECRET_OAUTH_TOKEN);
clientTwitchBot.connect();

// <------------- DECLARATIONS ---------->

const regexExpression =  new RegExp(/^[A-Za-z._-]+#([0-9]{4})$/);

// <------------- FUNCTIONS ---------->

userBotClientDiscord.on.ready = () => {
    console.log('USER BOT is alive');
    
}

clientDiscordBot.once("ready", () => {
    console.log("DISCORD BOT is alive");
});

(async ()  => {
    await pubSubClient.onRedemption(await pubSubClient.registerUserListener(authProvider), (message) => {
        if(message.rewardId == process.env.TWITCH_1000_XP_ID){
            if(regexExpression.test(message.message)){
                const discordUser = clientDiscordBot.users.cache.find(u => u.tag === message.message);
                if(discordUser != undefined && discordUser != null){
                    userBotClientDiscord.send(process.env.DISCORD_CHANNEL_REWARDS_ID,{ content:`.addxp <@${discordUser.id}> 1000`}).then(() => {
                        const REWARD_CHANNEL = clientDiscordBot.channels.cache.get(process.env.DISCORD_CHANNEL_REWARDS_ID);
                        REWARD_CHANNEL.awaitMessages({max:1,time: 3000,errors: ['time']}).then(messageFromDiscordBot => {
                            const incommingMessage = messageFromDiscordBot.first();
                            if('embeds' in incommingMessage && incommingMessage['embeds'].length > 0 && 'description' in incommingMessage['embeds'][0]){
                                if(incommingMessage['embeds'][0].description.includes('Successfully')){
                                    axios.patch(`${process.env.TWITCH_API_URL}?broadcaster_id=${process.env.TWITCH_BROADCASTER_ID}&reward_id=${message.rewardId}&id=${message.id}`,
                                        {'status': 'FULFILLED'},
                                        {
                                            headers:{
                                                'client-id': process.env.TWITCH_CLIENT_ID,
                                                'Authorization' : `Bearer ${process.env.TWITCH_ACCESS_TOKEN_MANAGE_REEDEM }`,
                                                'Content-Type': 'application/json'
                                            }
                                        }
                                    ).then(result => {
                                        console.log(result.data.data[0]);
                                        clientTwitchBot.say("#soyelchecho", "Se completo");
                                        //says that the xp reward was not possible to asign.
                                    }).catch(error => {
                                        console.log(error);
                                        //says that was a problem trying to complete or fullfield your reward
                                    })
                                }else{
                                    //says that the bot cant assign the xp so I will give back your points
                                }
                            }
                        }).catch(error => {
                            console.log(error);
                            //says that the bot dont respond so I will give back your points
                        })
                    }).catch(error => {
                        console.log(error);
                        //say in the chat that was an error sending the message to the discord and say that I will give back your points
                    });
                }else{
                    //cant find the user
                    //say in the chat that the user couldnt be find in the discord and say that I will give back your points
                    //update the reward to canceled or unfilled
                }
            }else{
                // No es un Id de discord valido, devolver 
            }
        }else{
            return;
        }
    });
})();