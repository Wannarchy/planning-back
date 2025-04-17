require('dotenv').config();
const { Client, Collection, Events ,GatewayIntentBits } = require("discord.js");
const mongoose = require("mongoose");
const path = require("node:path");
const fs = require("node:fs");



const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    //https://discord.com/developers/docs/events/gateway#gateway-intents
  ],
});


//https://www.youtube.com/watch?v=dRZ9lBjknHU&ab_channel=NouvelleTechno
client.commands = new Collection();
const foldersPath = path.join( "commands")
const commandFolders = fs.readdirSync(foldersPath)

console.log("Dossier des commandes :", foldersPath);
console.log("Dossiers trouvés :", commandFolders);


for(const folder of commandFolders){
  const commandsPath = path.join(foldersPath, folder)
  const commandsFiles = fs.readdirSync(commandsPath).filter(file =>
    file.endsWith(".js"));
  

    for(const file of commandsFiles){
      const filePath = path.resolve(commandsPath, file);
      const command = require(filePath);

      console.log(filePath)
      if("data" in command && "execute" in command){
        client.commands.set(command.data.name, command);
        
      }else{
        console.log("L'un des deux attributs est manquant")
      }
    }
}




//dynamically retrieving all the event files in the events folder. 
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

mongoose.connect(process.env.MONGODB_SRV, {
  useNewUrlParser: true,
  useUnifiedTopology:true,
}).then(() =>{
  console.log("Connecter DATABASE");
}).catch((err) => {
  console.log(err);
});



//On gere l'exécution de la commande



client.login(process.env.TOKEN);


