const fs = require('fs');
const Discord = require('discord.js');
const Client = require('./client/Client');
const { Routes } = require('discord-api-types/v9');
const { REST } = require('@discordjs/rest');
const { prefix } = require('./config.json');
const { Player } = require('discord-player');


const CLIENT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.BOT_ID;
const AUTHOR_ID = process.env.AUTHOR_ID;

const rest = new REST({version: '9'}).setToken(CLIENT_TOKEN);

const client = new Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

const player = new Player(client);

client.login(CLIENT_TOKEN);

player.on('error', (queue, error) => {
    console.log(`[${queue.guild.name}] Error emitted from the queue: ${error.message}`);
});

player.on('connectionError', (queue, error) => {
    console.log(`[${queue.guild.name}] Error emitted from the connection: ${error.message}`);
});

player.on('trackStart', (queue, track) => {
    queue.metadata.send(`🎶 | Started playing: **${track.title}** in **${queue.connection.channel.name}**!`);
});

player.on('trackAdd', (queue, track) => {
    queue.metadata.send(`🎶 | Track **${track.title}** queued!`);
});

player.on('botDisconnect', queue => {
    queue.metadata.send(`❌ | I was manually disconnected from the voice channel, clearing queue!`);
});

player.on('channelEmpty', queue => {
    queue.metadata.send(`❌ | Nobody is in the voice channel, leaving...`);
});

player.on('queueEnd', queue => {
    queue.metadata.send(`✅ | Queue finished!`);
});

client.once('ready', async () => {
    console.log('Ready!');
});

client.once('reconnecting', () => {
    console.log('Reconnection!');
});

client.once('disconnect', () => {
    console.log('Disconnecting!');
});

client.on("message", async (message) => {
    if(message.author.bot || !message.guild) return;
    if(!client.application?.owner) await client.application?.fetch();
    if(message.content === `${prefix}deploy`){
       (async () => {
        try {   
            rest.put(
                Routes.applicationGuildCommands(CLIENT_ID,message.guild.id),
                { body: client.commands},
            );
            message.reply("Deployed!");
        } catch (err) {
             message.reply("Could not deploy commands! Make sure the bot has the application.commands permission!");
             console.error(err);
        }
       })();
    }
});

client.on('interactionCreate', async interaction => {
    const command = client.commands.get(interaction.commandName.toLowerCase());
    try {
        if(interaction.commandName == 'ban' || interaction.commandName == 'userinfo'){
            command.execute(interaction, client);
        } else {
            command.execute(interaction, player);
            
        }
    } catch (error){
        client.users.fetch(AUTHOR_ID).then((user) => {
            user.send(error);
        });
        interaction.followUp({
            content: 'There was an error trying to execute that command!',
        });
    }
});

