const {SlashCommandBuilder} = require("discord.js");
const supabase = require("../../../config/supabase.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("etudiants")
        .setDescription("Affiche les noms des étudiants"),
    async execute(interaction){
        const { data, error } = await supabase.from("etudiants").select("nom");

        if (error) {
            console.error(error);
            await interaction.reply("Erreur lors de la récupération des étudiants.");
            return;
        }

        const noms = data.map((row) => row.nom).join(", ");
        await interaction.reply(noms || "Aucun étudiant trouvé.");
    }
}
