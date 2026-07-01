const axios = require("axios");
const supabase = require("../../config/supabase.js");

const BOT_API_URL = process.env.BOT_ALERT_URL || "http://127.0.0.1:3001/send-alert";
const CHANNEL_ID = process.env.DEFAULT_CHANNEL_ID || "1508096848227860563";

function ecouterNouvellesNotes() {
    supabase
        .channel("schema-db-changes")
        .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "notes" },
            async (payload) => {
                console.log("🔔 [REALTIME] Nouvelle note détectée !", payload.new);

                const note = payload.new;
                const message =
                    `🎓 **Nouvelle note enregistrée !**\n\n` +
                    `Matière : ${note.module_nom || "Non spécifiée"}\n` +
                    `Note : ${note.note}/20\n` +
                    `Commentaire : ${note.commentaires || "Aucun"}`;

                try {
                    await axios.post(BOT_API_URL, {
                        channelId: CHANNEL_ID,
                        message,
                    });
                    console.log("✅ [REALTIME] Notification envoyée au bot.");
                } catch (err) {
                    console.error("❌ [REALTIME] Erreur envoi bot :", err.message);
                }
            }
        )
        .subscribe((status) => {
            if (status === "SUBSCRIBED") {
                console.log("📡 [REALTIME] Écoute des nouvelles notes activée.");
            }
        });
}

module.exports = ecouterNouvellesNotes;
