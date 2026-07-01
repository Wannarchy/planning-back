async function handleAlert(interaction) {
    const role = interaction.options.getRole("role");
    const contenu = interaction.options.getString("message");

    if (!role || !contenu) {
        return interaction.reply("Le rôle et le message sont requis.");
    }

    await interaction.channel.send({
        content: `<@&${role.id}>\n\n📢 **Notification**\n\n${contenu}`,
        allowedMentions: { roles: [role.id] },
    });

    return interaction.reply(
        `Alerte envoyée — tous les membres avec le rôle **${role.name}** ont été pingés.`
    );
}

module.exports = { handleAlert };
