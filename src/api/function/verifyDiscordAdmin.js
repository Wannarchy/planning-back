const ROLES_AUTORISES = ["equipe", "admin"];
const DISCORD_API = "https://discord.com/api/v10";

async function discordBotFetch(path) {
    const botToken = process.env.TOKEN;
    if (!botToken) {
        throw new Error("TOKEN (bot Discord) manquant dans les variables d'environnement.");
    }

    return fetch(`${DISCORD_API}${path}`, {
        headers: { Authorization: `Bot ${botToken}` },
    });
}

async function verifyDiscordAdmin(discordUserId) {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
        throw new Error("GUILD_ID manquant dans les variables d'environnement.");
    }

    const memberRes = await discordBotFetch(`/guilds/${guildId}/members/${discordUserId}`);
    if (memberRes.status === 404) {
        return { ok: false, reason: "not_member" };
    }
    if (!memberRes.ok) {
        const text = await memberRes.text();
        throw new Error(`Discord API (membre) : ${memberRes.status} ${text}`);
    }

    const member = await memberRes.json();
    const rolesRes = await discordBotFetch(`/guilds/${guildId}/roles`);
    if (!rolesRes.ok) {
        const text = await rolesRes.text();
        throw new Error(`Discord API (rôles) : ${rolesRes.status} ${text}`);
    }

    const guildRoles = await rolesRes.json();
    const memberRoleNames = member.roles
        .map((roleId) => guildRoles.find((role) => role.id === roleId)?.name?.toLowerCase())
        .filter(Boolean);

    const isAdmin = memberRoleNames.some((name) => ROLES_AUTORISES.includes(name));
    if (!isAdmin) {
        return { ok: false, reason: "not_admin" };
    }

    return { ok: true, member };
}

module.exports = { verifyDiscordAdmin };
