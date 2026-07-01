const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { isAdmin } = require("../../function/isAdmin.js");
const { handleStats } = require("../../function/admin/handleStats.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Statistiques d'administration")
        .addStringOption((option) =>
            option
                .setName("type")
                .setDescription("Type de statistiques")
                .setRequired(true)
                .addChoices(
                    { name: "Présences", value: "presences" },
                    { name: "Notes", value: "notes" },
                    { name: "Activité", value: "activite" }
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
        return handleStats(interaction, type);
    },
};
