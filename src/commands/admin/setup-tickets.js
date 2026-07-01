const { SlashCommandBuilder, MessageFlags, ChannelType } = require("discord.js");
const { isAdmin } = require("../../function/isAdmin.js");
const support = require("../basic/support.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setup-tickets")
        .setDescription("Installe le panneau de tickets dans un salon")
        .addChannelOption((option) =>
            option
                .setName("salon")
                .setDescription("Salon ticket (par défaut : salon actuel)")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        ),

    async execute(interaction) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({
                content: "Tu n'as pas la permission d'utiliser cette commande.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const salon = interaction.options.getChannel("salon") || interaction.channel;

        const message = await support.postPanel(salon);

        try {
            await message.pin();
        } catch (error) {
            console.error("Impossible d'épingler le panneau :", error);
        }

        return interaction.reply({
            content: `✅ Panneau de tickets installé dans ${salon}.`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
