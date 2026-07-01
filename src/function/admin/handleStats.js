const { EmbedBuilder } = require("discord.js");
const supabase = require("../../../config/supabase.js");

async function handleStats(interaction, type) {
    if (type === "presences") {
        const { data: cours, error: errCours } = await supabase
            .from("cours")
            .select("promotion_code, module_nom");

        if (errCours) {
            console.error(errCours);
            return interaction.reply("Erreur lors de la récupération des présences.");
        }

        const { data: absences, error: errAbs } = await supabase
            .from("absences")
            .select("etudiant_id, cours(module_nom, promotion_code), etudiants(promotion_code)");

        if (errAbs) {
            console.error(errAbs);
            return interaction.reply("Erreur lors de la récupération des absences.");
        }

        const stats = {};

        for (const c of cours || []) {
            const key = `${c.promotion_code}|${c.module_nom}`;
            if (!stats[key]) {
                stats[key] = { promotion: c.promotion_code, module: c.module_nom, cours: 0, absences: 0 };
            }
            stats[key].cours++;
        }

        for (const a of absences || []) {
            const promo = a.cours?.promotion_code || a.etudiants?.promotion_code || "Inconnu";
            const module = a.cours?.module_nom || "Inconnu";
            const key = `${promo}|${module}`;
            if (!stats[key]) {
                stats[key] = { promotion: promo, module, cours: 0, absences: 0 };
            }
            stats[key].absences++;
        }

        const lignes = Object.values(stats).map((s) => {
            const taux = s.cours
                ? (((s.cours - s.absences) / s.cours) * 100).toFixed(1)
                : "N/A";
            return `• **${s.promotion}** — ${s.module} : **${taux}%** (${s.absences} absence(s) / ${s.cours} cours)`;
        });

        const embed = new EmbedBuilder()
            .setTitle("📊 Stats — Présences")
            .setColor(0x5865f2)
            .setDescription(lignes.join("\n") || "Aucune donnée disponible.")
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    if (type === "notes") {
        const { data, error } = await supabase
            .from("notes")
            .select("note, coefficient, module_nom, etudiants(promotion_code)");

        if (error) {
            console.error(error);
            return interaction.reply("Erreur lors de la récupération des notes.");
        }

        const global = { total: 0, coef: 0 };
        const parPromo = {};
        const parModule = {};

        for (const n of data || []) {
            const coef = n.coefficient ?? 1;
            const promo = n.etudiants?.promotion_code || "Inconnu";

            global.total += n.note * coef;
            global.coef += coef;

            if (!parPromo[promo]) parPromo[promo] = { total: 0, coef: 0 };
            parPromo[promo].total += n.note * coef;
            parPromo[promo].coef += coef;

            if (!parModule[n.module_nom]) parModule[n.module_nom] = { total: 0, coef: 0 };
            parModule[n.module_nom].total += n.note * coef;
            parModule[n.module_nom].coef += coef;
        }

        const moyenneGlobale = global.coef ? (global.total / global.coef).toFixed(2) : "N/A";

        const detailPromo = Object.entries(parPromo)
            .map(([promo, s]) => `• **${promo}** : ${(s.total / s.coef).toFixed(2)}/20`)
            .join("\n");

        const detailModule = Object.entries(parModule)
            .map(([module, s]) => `• **${module}** : ${(s.total / s.coef).toFixed(2)}/20`)
            .join("\n");

        const embed = new EmbedBuilder()
            .setTitle("📊 Stats — Notes")
            .setColor(0x5865f2)
            .addFields(
                { name: "Moyenne globale", value: `**${moyenneGlobale}/20**` },
                { name: "Par promotion", value: detailPromo || "—" },
                { name: "Par module", value: detailModule || "—" }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    if (type === "activite") {
        const { data, error } = await supabase
            .from("logs")
            .select("action, details, date_creation")
            .order("date_creation", { ascending: false })
            .limit(500);

        if (error) {
            console.error(error);
            return interaction.reply("Erreur lors de la récupération de l'activité.");
        }

        const parCommande = {};
        const utilisateurs = new Set();

        for (const log of data || []) {
            parCommande[log.action] = (parCommande[log.action] || 0) + 1;
            if (log.details) utilisateurs.add(log.details);
        }

        const detail = Object.entries(parCommande)
            .sort((a, b) => b[1] - a[1])
            .map(([cmd, count]) => `• **${cmd}** : ${count} utilisation(s)`)
            .join("\n");

        const embed = new EmbedBuilder()
            .setTitle("📊 Stats — Activité du bot")
            .setColor(0x5865f2)
            .addFields(
                { name: "Utilisateurs uniques", value: `${utilisateurs.size}`, inline: true },
                { name: "Commandes enregistrées", value: `${data?.length || 0}`, inline: true },
                { name: "Détail par commande", value: detail || "Aucune activité enregistrée." }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    return interaction.reply("Type inconnu. Utilise : `presences`, `notes` ou `activite`.");
}

module.exports = { handleStats };
