const { REST, Routes} = require("discord.js");
require('dotenv').config();
const fs = require("node:fs");
const path = require("node:path");


const commands = [];
const foldersPath = path.join( "commands")
const commandFolders = fs.readdirSync(foldersPath)


for(const folder of commandFolders){
  const commandsPath = path.join(foldersPath, folder)
  const commandsFiles = fs.readdirSync(commandsPath).filter(file =>
    file.endsWith(".js"));
  

    for(const file of commandsFiles){
      const filePath = path.resolve(commandsPath, file);
      const command = require(filePath);

      console.log(filePath)
      if("data" in command && "execute" in command){
        commands.push(command.data.toJSON());
        
      }else{
        console.log("L'un des deux attributs est manquant")
      }
    }
}

// 
const rest = new REST().setToken(process.env.TOKEN);

//on deploie les commandes
(async () => {
    try{
      
        console.log(`Début de rafraichissment des ${commands.length}`)

        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            {body: commands}
        );
        
        console.log(`FIN de rafraichissment des ${data.length}`)
    }catch(error){
        console.error(error);
    }
})();
