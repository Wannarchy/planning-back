const { Events, MessageFlags } = require("discord.js");
const { logActivity } = require("../function/logActivity.js");
const { isAdmin } = require("../function/isAdmin.js");
const { verifierCommande, messageRateLimit } = require("../function/antiSpam.js");
const support = require("../commands/basic/support.js");

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            if (interaction.isButton()) {
                if (interaction.customId === "support_create") {
                    await support.handleCreateButton(interaction);
                    return;
                }
                if (interaction.customId.startsWith("support_open_")) {
                    await support.handleButton(interaction);
                    return;
                }
            }

            if (interaction.isModalSubmit()) {
                if (interaction.customId === "support_create_submit") {
                    await support.handleCreateModal(interaction);
                    return;
                }
                if (interaction.customId.startsWith("support_submit_")) {
                    await support.handleModal(interaction);
                    return;
                }
            }

            if (interaction.isAutocomplete()) {
                const command = interaction.client.commands.get(interaction.commandName);
                if (command?.autocomplete) await command.autocomplete(interaction);
                return;
            }

            if (!interaction.isChatInputCommand()) return;

            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            if (!isAdmin(interaction.member)) {
                const limite = await verifierCommande(interaction.user.id);
                if (!limite.autorise) {
                    return interaction.reply({
                        content: messageRateLimit(limite.retryAfterSec),
                        flags: MessageFlags.Ephemeral,
                    });
                }
            }

            await command.execute(interaction);
            await logActivity(interaction.user.id, interaction.commandName);
        } catch (error) {
            console.error(`Error executing interaction`);
            console.error(error);

            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "Une erreur est survenue.",
                    ephemeral: true,
                });
            }
        }
    },
};
