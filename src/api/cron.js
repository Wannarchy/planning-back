const cron = require("node-cron");
const axios = require("axios");
const supabase = require("../../config/supabase.js");

const BOT_API_URL = process.env.BOT_ALERT_URL || "http://127.0.0.1:3001/send-alert";
const DEFAULT_CHANNEL_ID = process.env.DEFAULT_CHANNEL_ID || "1508096848227860563";

const CHANNELS_PAR_PROMO = {
    INFO1: "1508515898959597639",
    INFO2: "1508515938725789806",
    INFO3: "1508515984317612142",
    INFO4: "1508516023056334919",
    INFO5: "1508516057764204594",
    INFO6: "1508516084683112469",
    INFO7: "1508516119105896570",
    INFO8: "1508516141436506224",
    INFO9: "1508516165616537842",
};

async function executerRappelCours() {
    try {
        const demain = new Date();
        demain.setDate(demain.getDate() + 1);
        const dateStr = demain.toISOString().split("T")[0];

        const { data: cours, error } = await supabase
            .from("cours")
            .select("module_nom, heure_debut, salle_code, enseignant_nom, promotion_code")
            .eq("date_cours", dateStr);

        if (error) throw error;

        if (cours && cours.length > 0) {
            const coursParPromo = cours.reduce((acc, c) => {
                (acc[c.promotion_code] = acc[c.promotion_code] || []).push(c);
                return acc;
            }, {});

            for (const [promo, listeCours] of Object.entries(coursParPromo)) {
                let message = `📅 **Rappel : Tes cours de demain (${promo}) :**\n\n`;
                listeCours.forEach((c) => {
                    message += `• **${c.module_nom}** | ${c.heure_debut.substring(0, 5)} | 📍 ${c.salle_code} | 👤 ${c.enseignant_nom}\n`;
                });

                const targetChannel = CHANNELS_PAR_PROMO[promo] || DEFAULT_CHANNEL_ID;
                await axios.post(BOT_API_URL, { channelId: targetChannel, message });
                console.log(`✅ [CRON] Rappel envoyé pour ${promo}`);
            }
        } else {
            console.log("ℹ️ [CRON] Aucun cours pour demain.");
        }
    } catch (err) {
        console.error("❌ [CRON] Erreur rappel :", err.message);
    }
}

async function executerResumeHebdo() {
    try {
        const today = new Date();
        const diff = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1);
        const lundiDernier = new Date(today);
        lundiDernier.setDate(diff);
        const lundiStr = lundiDernier.toISOString().split("T")[0];

        const lundiProchain = new Date(lundiDernier);
        lundiProchain.setDate(lundiProchain.getDate() + 7);
        const lundiProchainStr = lundiProchain.toISOString().split("T")[0];

        const dimancheProchain = new Date(lundiProchain);
        dimancheProchain.setDate(dimancheProchain.getDate() + 6);
        const dimancheProchainStr = dimancheProchain.toISOString().split("T")[0];

        const { data: notes } = await supabase.from("notes").select("id").gte("date_creation", lundiStr);
        const { data: absences } = await supabase.from("absences").select("id").gte("date_creation", lundiStr);

        const { data: coursSemaine } = await supabase
            .from("cours")
            .select("module_nom, date_cours")
            .gte("date_cours", lundiProchainStr)
            .lte("date_cours", dimancheProchainStr)
            .order("date_cours", { ascending: true });

        let msg = "📊 **Résumé Hebdomadaire :**\n\n";
        msg += `🎓 Notes enregistrées : ${notes ? notes.length : 0}\n`;
        msg += `🚨 Absences signalées : ${absences ? absences.length : 0}\n\n`;
        msg += "📅 **Aperçu semaine prochaine :**\n";

        if (coursSemaine && coursSemaine.length > 0) {
            coursSemaine.forEach((c) => {
                msg += `• ${c.date_cours} : ${c.module_nom}\n`;
            });
        } else {
            msg += "Aucun cours prévu.\n";
        }

        msg += "\nPensez à consulter vos outils pour le détail !";

        await axios.post(BOT_API_URL, { channelId: DEFAULT_CHANNEL_ID, message: msg });
        console.log("✅ [CRON] Résumé hebdomadaire envoyé.");
    } catch (err) {
        console.error("❌ [CRON] Erreur résumé :", err.message);
    }
}

cron.schedule("0 18 * * *", executerRappelCours);
cron.schedule("0 20 * * 0", executerResumeHebdo);

console.log("🚀 [CRON] Service d'automatisation démarré.");

module.exports = { executerRappelCours, executerResumeHebdo };
