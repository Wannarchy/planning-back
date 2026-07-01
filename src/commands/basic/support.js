const {
    SlashCommandBuilder,
    MessageFlags,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require("discord.js");
const supabase = require("../../../config/supabase.js");
const { getEtudiant } = require("../../function/getEtudiant.js");
const { isAdmin } = require("../../function/isAdmin.js");
const {
    verifierTicketBouton,
    verifierCreationTicket,
    enregistrerTicketBouton,
    enregistrerTicketCreate,
    messageRateLimit,
    LIMITES,
} = require("../../function/antiSpam.js");

const DELAI_REPONSE = "24 à 48 heures";

function buildPanelEmbed() {
    return new EmbedBuilder()
        .setTitle("🎫 Support technique")
        .setColor(0x5865f2)
        .setDescription(
            "Besoin d'aide ? Clique sur le bouton ci-dessous pour ouvrir un ticket.\n\n" +
            "Notre équipe te répondra dans un délai estimé de **24 à 48 heures**."
        )
        .setTimestamp();
}

function buildPanelButton() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("support_create")
            .setLabel("Ouvrir un ticket")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🎫")
    );
}

function buildTicketEmbed(ticketId, contenu) {
    return new EmbedBuilder()
        .setTitle("🎫 Ticket de support créé")
        .setColor(0x57f287)
        .addFields(
            { name: "Numéro de ticket", value: `**#${ticketId}**`, inline: true },
            { name: "Délai de réponse estimé", value: DELAI_REPONSE, inline: true },
            { name: "Votre message", value: contenu.slice(0, 1024) }
        )
        .setTimestamp();
}

function buildTicketButton(ticketId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`support_open_${ticketId}`)
            .setLabel("Compléter le ticket")
            .setStyle(ButtonStyle.Secondary)
    );
}

async function creerTicket(interaction, contenu) {
    const etudiant = await getEtudiant(interaction.user.id);

    if (!etudiant) {
        return interaction.reply({
            content: "Tu n'es pas enregistré dans la base de données.",
            flags: MessageFlags.Ephemeral,
        });
    }

    const admin = isAdmin(interaction.member);

    if (!admin) {
        const limite = await verifierCreationTicket(interaction.user.id);
        if (!limite.autorise) {
            return interaction.reply({
                content: messageRateLimit(limite.retryAfterSec),
                flags: MessageFlags.Ephemeral,
            });
        }

        const { count, error: errCount } = await supabase
            .from("tickets_support")
            .select("*", { count: "exact", head: true })
            .eq("etudiant_id", etudiant.id)
            .eq("statut", "Ouvert");

        if (errCount) {
            console.error(errCount);
        } else if (count >= LIMITES.ticketsOuvertsMax) {
            return interaction.reply({
                content: `Tu as déjà **${LIMITES.ticketsOuvertsMax}** ticket(s) ouvert(s). Attends qu'un admin le traite avant d'en ouvrir un nouveau.`,
                flags: MessageFlags.Ephemeral,
            });
        }
    }

    const { data, error } = await supabase
        .from("tickets_support")
        .insert({
            etudiant_id: etudiant.id,
            message: contenu,
            statut: "Ouvert",
        })
        .select("id")
        .single();

    if (error || !data) {
        console.error(error);
        return interaction.reply({
            content: "Erreur lors de la création du ticket.",
            flags: MessageFlags.Ephemeral,
        });
    }

    const ticketId = data.id;
    await enregistrerTicketCreate(interaction.user.id);

    return interaction.reply({
        embeds: [buildTicketEmbed(ticketId, contenu)],
        components: [buildTicketButton(ticketId)],
        flags: MessageFlags.Ephemeral,
    });
}

async function verifierProprietaire(interaction, ticketId) {
    const etudiant = await getEtudiant(interaction.user.id);

    if (!etudiant) {
        return { error: "Tu n'es pas enregistré dans la base de données." };
    }

    const { data: ticket, error } = await supabase
        .from("tickets_support")
        .select("id, etudiant_id, message")
        .eq("id", ticketId)
        .single();

    if (error || !ticket) {
        return { error: "Ticket introuvable." };
    }

    if (ticket.etudiant_id !== etudiant.id) {
        return { error: "Ce ticket ne t'appartient pas." };
    }

    return { ticket, etudiant };
}

async function handleCreateButton(interaction) {
    const etudiant = await getEtudiant(interaction.user.id);

    if (!etudiant) {
        return interaction.reply({
            content: "Tu n'es pas enregistré dans la base de données.",
            flags: MessageFlags.Ephemeral,
        });
    }

    if (!isAdmin(interaction.member)) {
        const limite = await verifierTicketBouton(interaction.user.id);
        if (!limite.autorise) {
            return interaction.reply({
                content: messageRateLimit(limite.retryAfterSec),
                flags: MessageFlags.Ephemeral,
            });
        }
        await enregistrerTicketBouton(interaction.user.id);
    }

    const modal = new ModalBuilder()
        .setCustomId("support_create_submit")
        .setTitle("Ouvrir un ticket");

    const message = new TextInputBuilder()
        .setCustomId("message")
        .setLabel("Décrivez votre problème")
        .setPlaceholder("Expliquez votre demande le plus précisément possible...")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder().addComponents(message));

    return interaction.showModal(modal);
}

async function handleCreateModal(interaction) {
    const contenu = interaction.fields.getTextInputValue("message");
    return creerTicket(interaction, contenu);
}

async function handleButton(interaction) {
    const ticketId = interaction.customId.replace("support_open_", "");
    const result = await verifierProprietaire(interaction, ticketId);

    if (result.error) {
        return interaction.reply({
            content: result.error,
            flags: MessageFlags.Ephemeral,
        });
    }

    const modal = new ModalBuilder()
        .setCustomId(`support_submit_${ticketId}`)
        .setTitle(`Ticket #${ticketId}`);

    const details = new TextInputBuilder()
        .setCustomId("details")
        .setLabel("Détails supplémentaires")
        .setPlaceholder("Précisez votre problème, contexte, captures d'écran...")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder().addComponents(details));

    return interaction.showModal(modal);
}

async function handleModal(interaction) {
    const ticketId = interaction.customId.replace("support_submit_", "");
    const details = interaction.fields.getTextInputValue("details");
    const result = await verifierProprietaire(interaction, ticketId);

    if (result.error) {
        return interaction.reply({
            content: result.error,
            flags: MessageFlags.Ephemeral,
        });
    }

    const { error } = await supabase
        .from("tickets_support")
        .update({
            message: `${result.ticket.message}\n\n---\n${details}`,
        })
        .eq("id", ticketId);

    if (error) {
        console.error(error);
        return interaction.reply({
            content: "Erreur lors de la mise à jour du ticket.",
            flags: MessageFlags.Ephemeral,
        });
    }

    return interaction.reply({
        content: `✅ Ticket **#${ticketId}** mis à jour avec succès.`,
        flags: MessageFlags.Ephemeral,
    });
}

async function postPanel(channel) {
    return channel.send({
        embeds: [buildPanelEmbed()],
        components: [buildPanelButton()],
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("support")
        .setDescription("Crée un ticket de support technique")
        .addStringOption((option) =>
            option
                .setName("message")
                .setDescription("Décrivez votre problème")
                .setRequired(true)
        ),

    async execute(interaction) {
        const contenu = interaction.options.getString("message");
        return creerTicket(interaction, contenu);
    },

    buildPanelEmbed,
    buildPanelButton,
    postPanel,
    handleCreateButton,
    handleCreateModal,
    handleButton,
    handleModal,
};
