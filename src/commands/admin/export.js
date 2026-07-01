const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { isAdmin } = require("../../function/isAdmin.js");
const { handleExport } = require("../../function/admin/handleExport.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("export")
        .setDescription("Exporte des données en CSV")
        .addStringOption((option) =>
            option
                .setName("type")
                .setDescription("Type de données à exporter")
                .setRequired(true)
                .addChoices(
                    { name: "Présences", value: "presences" },
                    { name: "Notes", value: "notes" },
                    { name: "Tickets", value: "tickets" },
                    { name: "Logs", value: "logs" }
                )
        )
        .addStringOption((option) =>
            option
                .setName("periode")
                .setDescription("mois, semaine, tous ou 2024-06")
                .setRequired(false)
                .addChoices(
                    { name: "Mois en cours", value: "mois" },
                    { name: "Semaine en cours", value: "semaine" },
                    { name: "Toutes périodes", value: "tous" }
                )
        ),

    async execute(interaction) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({
                content: "Tu n'as pas la permission d'utiliser cette commande.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const type = interaction.options.getString("type");
        const periode = interaction.options.getString("periode") || "mois";

        return handleExport(interaction, type, periode);
    },
};
