var toxicity = require("@tensorflow-models/toxicity");
global.fetch = require("node-fetch");
var fs = require("fs");

const helpMessage = 'This bot is designed to monitor toxicity and mute the members who are being toxic.\n'+
        'The bot will respond to the following commands:\n'+
        '!activate_mute - sets the bot\'s option of muting people to true.\n'+
        '!deactivate_mute - sets the bot\'s option of muting people to false.\n'+
        '!show_strikes @some_member - shows how many strikes a member has.\n';



function activateDiscord() {
        const Discord = require("discord.js");
        const bot = new Discord.Client();
        const TOKEN = "";

        const settingsPath = "./settings.json";

        var guild;
        var mutedNibber;
        var generalChannel;

        const timeToRefresh = hoursToMillis(1/360); //in millis
        const timeToMute = hoursToMillis(1/60); //in millis

        bot.on('message', message => {
                if (!message.author.bot) {
                        if (message.content.startsWith('!')) {
                                let text = message.content;
                                let member = message.mentions.members.first();
                                let filePath = "";
                                if (member)
                                        filePath = "./"+member.id+".json";
                                if (text.includes('help')) {
                                        message.reply(helpMessage);
                                } else if (text === '!activate_mute') {
                                        fs.readFile(settingsPath, (err, data) => {
                                                if (err) {
                                                        console.log(err);
                                                        return;
                                                }
                                                var json = JSON.parse(data);
                                                json.toMute = true;
                                                json = JSON.stringify(json);
                                                fs.writeFile(settingsPath, json, err => {
                                                        if (err) {
                                                                console.log(err);
                                                                return;
                                                        }
                                                        message.reply('Mute activated!');
                                                });
                                        });
                                } else if (text === '!deactivate_mute') {
                                        fs.readFile(settingsPath, (err, data) => {
                                                if (err) {
                                                        console.log(err);
                                                        return;
                                                }
                                                var json = JSON.parse(data);
                                                json.toMute = false;
                                                json = JSON.stringify(json);
                                                fs.writeFile(settingsPath, json, err => {
                                                        if (err) {
                                                                console.log(err);
                                                                return;
                                                        }
                                                        message.reply('Mute deactivated!');
                                                });
                                        });
                                } else if (text.includes('show_strikes')) {
                                        if (member) {
                                                fs.readFile(filePath, (err,data) => {
                                                        if (err) {
                                                                if (err.code === 'ENOENT') {
                                                                        message.reply('sry, but I couldn\'t find the data for this user...');
                                                                }
                                                                console.log(err);
                                                                return;
                                                        }
                                                        var json = JSON.parse(data);
                                                        message.reply('\n'+member.toString()+
                                                        ' has '+ json.strikes+' strikes, and '+ json.megaStrikes+' mega strikes.');
                                                });
                                        } else {
                                                message.reply('You haven\'t mentioned a member!');
                                        }
                                }
                        } else {
                                classifySent(message.content, "", m => {
                                        var filePath = './'+message.author.id+'.json';
                                        fs.stat(filePath, (err, stat) => {
                                                if (err == null) {
                                                        console.log("nice meme");
                                                        var isStrike = !(m === "You are fine!");
                                                        if (isStrike) {
                                                                fs.readFile(filePath ,(err,data) => {
                                                                        fs.readFile(settingsPath, (errS, dataS) => {
                                                                                var json = JSON.parse(data);
                                                                                var jsonS = JSON.parse(dataS);

                                                                                json.strikes++;
                                                                                var nStrikes = json.strikes;
                                                                                json = JSON.stringify(json);
                                                                                fs.writeFile(filePath, json, (err) => {
                                                                                        if (err) throw err;
                                                                                        console.log('Saved!');
                                                                                });
                                                                                json = JSON.parse(json);
                                                                                if (nStrikes < 3 && jsonS.toMute) {
                                                                                        message.reply("You are not allowed to be toxic here.\n"+
                                                                                        "Here are your sins:\n"+m+
                                                                                        "\n"+"You have "+nStrikes+" strikes, on 3 YOU WILL BE MUTED!");
                                                                                } else if (nStrikes >= 3 && jsonS.toMute) {
                                                                                        message.reply("You are not allowed to be toxic here.\n"+
                                                                                        "Here are your sins:\n"+m+
                                                                                        "\n"+"You have 3 or more strikes, so now... YOU SHALL BE MUTED!");
                                                                                        message.member.addRole(mutedNibber).catch(console.error);
                                                                                        json.megaStrikes++;
                                                                                        json.strikes = 0;
                                                                                        json.timeOfMute = new Date();
                                                                                        json = JSON.stringify(json); 
                                                                                        fs.writeFile(filePath, json, (err) => {
                                                                                                if (err) throw err;
                                                                                                console.log('Saved!');
                                                                                        });
                                                                                } else if (!jsonS.toMute) {
                                                                                        message.reply("You are not allowed to be toxic here.\n"+
                                                                                        "Here are your sins:\n"+m+
                                                                                        "\n"+"You have "+nStrikes+" strikes.");
                                                                                }
                                                                        });
                                                                });
                                                        }
                                                } else if (err.code === 'ENOENT') {
                                                        console.log("not a nice meme");
                                                        var json = JSON.stringify({
                                                                strikes: 0,
                                                                megaStrikes: 0,
                                                                timeOfMute: null
                                                        });
                                                        fs.writeFile(filePath, json, (err) => {
                                                                if (err) throw err;
                                                                console.log('Saved!');
                                                        });
                                                } else {
                                                        console.log('Some other error: ', err.code);
                                                }
                                        });
                                });
                        }
                }
        });

        bot.setInterval(() => {
                bot.guilds.forEach(guild => {
                        guild.members.forEach(member => {
                                let filePath = "./"+member.id+".json";
                                fs.readFile(filePath, (err,data) => {
                                        if (err) {
                                                return;
                                        }
                                        var json = JSON.parse(data);
                                        if (json.megaStrikes < 1 && json.timeOfMute != null && timePassed(Date.parse(json.timeOfMute)) > timeToMute) {
                                                json.timeOfMute = null;
                                                member.removeRole(mutedNibber);
                                                generalChannel.send(member.toString()+'\n'+'You are now unmuted, please use your renewed power wiseley.');
                                                json = JSON.stringify(json);
                                                fs.writeFile(filePath, json, err => {
                                                        if (err) throw err;
                                                });
                                        }
                                });
                        });
                });
        }, timeToRefresh);
        bot.on('ready', () => {
                guild = bot.guilds.find(g => 
                        g.id === ""
                );
                mutedNibber = guild.roles.find(r => r.name === 'muted-nibber');
                generalChannel = guild.channels.find(c =>
                        c.id === ""
                );
                bot.guilds.forEach(guild => {
                        if (!guild.roles.has(mutedNibber.id)) {
                                guild.createRole(mutedNibber)
                                        .then(role => console.log(`Created new role with name ${role.name} and color ${role.color}`))
                                        .catch(console.error);
                        }
                });
                console.log("ready");
        });

        bot.login(TOKEN);
}

activateDiscord();
const threshold = 0.5;
//var view = document.getElementById("consoleP");
function classifySent(sent, idToUpdate, callBack) {
        toxicity.load(threshold).then(model => {
                const sentences = [sent];
              
                model.classify(sentences).then(predictions => {
                        var res = "";
                        predictions.forEach(pre => {
                                if (pre.results[0].match == null || pre.results[0].match)
                                        res += pre.label +"\n";
                        });
                        if (res === "")
                                res = "You are fine!";
                        else
                                res = "Issues:\n"+res;
                        
                        if (idToUpdate != "") {
                                view.innerHTML = strToHtml(res);
                        }
                        if (typeof callBack === 'function') {
                                callBack(res);
                        }
                });
        }); 
}

function strToHtml(str) {
        return str.replace(/\n/gi, "<br>");
}

function timePassed(millis) {
        let tDate = new Date();
        return tDate.getTime() - millis;
}

function hoursToMillis(time, invert) {
        const c = 3600000;
        if (invert) {
                return time/c;
        } else {
                return time*c;
        }
}
