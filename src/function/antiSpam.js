const supabase = require("../../config/supabase.js");

const LIMITES = {
    commande: { max: 5, fenetreMs: 30_000 },
    commandeCooldownMs: 2_000,
    ticket: { max: 1, fenetreMs: 5 * 60_000 },
    ticketBoutonMs: 10_000,
    ticketsOuvertsMax: 3,
};

const ACTIONS_TICKET = ["ticket_bouton", "ticket_create"];

function retryAfterSec(dateCreation, fenetreMs) {
    const expire = new Date(dateCreation).getTime() + fenetreMs;
    return Math.max(1, Math.ceil((expire - Date.now()) / 1000));
}

function retryCooldownSec(dateCreation, cooldownMs) {
    const expire = new Date(dateCreation).getTime() + cooldownMs;
    return Math.max(1, Math.ceil((expire - Date.now()) / 1000));
}

async function logEvenement(discordId, action) {
    const { error } = await supabase.from("logs").insert({
        action,
        details: discordId,
    });

    if (error) {
        console.error("Erreur log anti-spam :", error);
    }
}

async function verifierCommande(userId) {
    const depuis = new Date(Date.now() - LIMITES.commande.fenetreMs).toISOString();

    const { data, error } = await supabase
        .from("logs")
        .select("date_creation, action")
        .eq("details", userId)
        .gte("date_creation", depuis)
        .order("date_creation", { ascending: false });

    if (error) {
        console.error(error);
        return { autorise: true };
    }

    const commandes = (data || []).filter((log) => !ACTIONS_TICKET.includes(log.action));

    if (commandes.length >= LIMITES.commande.max) {
        const plusAncien = commandes[commandes.length - 1];
        return {
            autorise: false,
            retryAfterSec: retryAfterSec(plusAncien.date_creation, LIMITES.commande.fenetreMs),
        };
    }

    if (commandes.length > 0) {
        const dernier = commandes[0];
        const ecoule = Date.now() - new Date(dernier.date_creation).getTime();
        if (ecoule < LIMITES.commandeCooldownMs) {
            return {
                autorise: false,
                retryAfterSec: retryCooldownSec(dernier.date_creation, LIMITES.commandeCooldownMs),
            };
        }
    }

    return { autorise: true };
}

async function verifierTicketBouton(userId) {
    const { data, error } = await supabase
        .from("logs")
        .select("date_creation")
        .eq("details", userId)
        .eq("action", "ticket_bouton")
        .order("date_creation", { ascending: false })
        .limit(1);

    if (error) {
        console.error(error);
        return { autorise: true };
    }

    if (data?.length) {
        const ecoule = Date.now() - new Date(data[0].date_creation).getTime();
        if (ecoule < LIMITES.ticketBoutonMs) {
            return {
                autorise: false,
                retryAfterSec: retryCooldownSec(data[0].date_creation, LIMITES.ticketBoutonMs),
            };
        }
    }

    return { autorise: true };
}

async function verifierCreationTicket(userId) {
    const depuis = new Date(Date.now() - LIMITES.ticket.fenetreMs).toISOString();

    const { data, error } = await supabase
        .from("logs")
        .select("date_creation")
        .eq("details", userId)
        .eq("action", "ticket_create")
        .gte("date_creation", depuis)
        .order("date_creation", { ascending: false });

    if (error) {
        console.error(error);
        return { autorise: true };
    }

    if ((data || []).length >= LIMITES.ticket.max) {
        const plusAncien = data[data.length - 1];
        return {
            autorise: false,
            retryAfterSec: retryAfterSec(plusAncien.date_creation, LIMITES.ticket.fenetreMs),
        };
    }

    return { autorise: true };
}

async function enregistrerTicketBouton(userId) {
    await logEvenement(userId, "ticket_bouton");
}

async function enregistrerTicketCreate(userId) {
    await logEvenement(userId, "ticket_create");
}

function messageRateLimit(retryAfterSec) {
    return `⏳ Trop de requêtes. Réessaie dans **${retryAfterSec}** seconde(s).`;
}

module.exports = {
    LIMITES,
    verifierCommande,
    verifierTicketBouton,
    verifierCreationTicket,
    enregistrerTicketBouton,
    enregistrerTicketCreate,
    messageRateLimit,
};
