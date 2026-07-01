const { AttachmentBuilder, MessageFlags } = require("discord.js");
const supabase = require("../../../config/supabase.js");
const { getPeriodRange } = require("../getPeriod.js");

function toCSV(headers, rows) {
    const lignes = [headers.join(";")];
    for (const row of rows) {
        lignes.push(headers.map((h) => String(row[h] ?? "").replace(/;/g, ",")).join(";"));
    }
    return lignes.join("\n");
}

function filtrerParPeriode(query, colonne, periode) {
    const { start, end } = getPeriodRange(periode);
    if (start) query = query.gte(colonne, start);
    if (end) query = query.lte(colonne, end);
    return query;
}

async function handleExport(interaction, type, periode = "mois") {
    const { label } = getPeriodRange(periode);
    const flags = MessageFlags.Ephemeral;

    let csv = "";
    let filename = "";

    if (type === "presences") {
        let query = supabase
            .from("absences")
            .select("etudiant_id, justifie, motif, date_creation, cours(date_cours, module_nom, promotion_code), etudiants(nom, prenom, promotion_code)");

        query = filtrerParPeriode(query, "date_creation", periode);
        const { data, error } = await query;

        if (error) {
            console.error(error);
            return interaction.reply({ content: "Erreur lors de l'export des présences.", flags });
        }

        const headers = ["nom", "prenom", "promotion", "module", "date_cours", "justifie", "motif"];
        const rows = (data || []).map((a) => ({
            nom: a.etudiants?.nom,
            prenom: a.etudiants?.prenom,
            promotion: a.etudiants?.promotion_code || a.cours?.promotion_code,
            module: a.cours?.module_nom,
            date_cours: a.cours?.date_cours,
            justifie: a.justifie ? "oui" : "non",
            motif: a.motif,
        }));

        csv = toCSV(headers, rows);
        filename = `presences_${periode}.csv`;
    } else if (type === "notes") {
        let query = supabase
            .from("notes")
            .select("module_nom, note, coefficient, commentaires, date_creation, etudiants(nom, prenom, promotion_code)");

        query = filtrerParPeriode(query, "date_creation", periode);
        const { data, error } = await query;

        if (error) {
            console.error(error);
            return interaction.reply({ content: "Erreur lors de l'export des notes.", flags });
        }

        const headers = ["nom", "prenom", "promotion", "module", "note", "coefficient", "commentaires"];
        const rows = (data || []).map((n) => ({
            nom: n.etudiants?.nom,
            prenom: n.etudiants?.prenom,
            promotion: n.etudiants?.promotion_code,
            module: n.module_nom,
            note: n.note,
            coefficient: n.coefficient,
            commentaires: n.commentaires,
        }));

        csv = toCSV(headers, rows);
        filename = `notes_${periode}.csv`;
    } else if (type === "tickets") {
        let query = supabase
            .from("tickets_support")
            .select("id, message, statut, date_creation, commentaire_admin, etudiants(nom, prenom, promotion_code)");

        query = filtrerParPeriode(query, "date_creation", periode);
        const { data, error } = await query;

        if (error) {
            console.error(error);
            return interaction.reply({ content: "Erreur lors de l'export des tickets.", flags });
        }

        const headers = ["id", "nom", "prenom", "promotion", "message", "statut", "commentaire_admin", "date_creation"];
        const rows = (data || []).map((t) => ({
            id: t.id,
            nom: t.etudiants?.nom,
            prenom: t.etudiants?.prenom,
            promotion: t.etudiants?.promotion_code,
            message: t.message,
            statut: t.statut,
            commentaire_admin: t.commentaire_admin,
            date_creation: t.date_creation,
        }));
        csv = toCSV(headers, rows);
        filename = `tickets_${periode}.csv`;
    } else if (type === "logs") {
        let query = supabase
            .from("logs")
            .select("action, details, date_creation");

        query = filtrerParPeriode(query, "date_creation", periode);
        const { data, error } = await query;

        if (error) {
            console.error(error);
            return interaction.reply({ content: "Erreur lors de l'export des logs.", flags });
        }

        const headers = ["action", "details", "date_creation"];
        const rows = data || [];
        csv = toCSV(headers, rows);
        filename = `logs_${periode}.csv`;
    } else {
        return interaction.reply({ content: "Type inconnu. Utilise : `presences`, `notes`, `tickets` ou `logs`.", flags });
    }

    if (!csv) {
        return interaction.reply({ content: "Aucune donnée à exporter pour cette période.", flags });
    }

    const fichier = new AttachmentBuilder(Buffer.from(csv, "utf-8"), { name: filename });

    return interaction.reply({
        content: `📁 Export **${type}** — ${label}`,
        files: [fichier],
        flags,
    });
}

module.exports = { handleExport };
