const supabase = require("../../config/supabase.js");

async function logActivity(discordId, commande) {
    const { error } = await supabase.from("logs").insert({
        action: commande,
        details: discordId,
    });

    if (error) {
        console.error("Erreur log activité :", error);
    }
}

module.exports = { logActivity };
