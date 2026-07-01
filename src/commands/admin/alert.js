const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { isAdmin } = require("../../function/isAdmin.js");
const { handleAlert } = require("../../function/admin/handleAlert.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("alert")
        .setDescription("Envoie une notification à un rôle")
        .addRoleOption((option) =>
            option
                .setName("role")
                .setDescription("Rôle à notifier")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("message")
                .setDescription("Contenu de la notification")
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({
                content: "Tu n'as pas la permission d'utiliser cette commande.",
                flags: MessageFlags.Ephemeral,
            });
        }

        return handleAlert(interaction);
    },
};
