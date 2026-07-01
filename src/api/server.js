const path = require("node:path");
const express = require("express");
const cors = require("cors");
const { Parser } = require("json2csv");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const supabase = require("../../config/supabase.js");
const ticketsRouter = require("./routes/tickets.js");
const studentsRouter = require("./routes/students.js");
const authRouter = require("./routes/auth.js");
const authenticateToken = require("./middleware/auth.js");

const app = express();
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.use("/api/tickets", ticketsRouter);
app.use("/api/students", studentsRouter);
app.use("/api/auth", authRouter);

app.get("/test", (req, res) => {
    res.json({ message: "Le serveur fonctionne !" });
});

app.get("/", (req, res) => {
    res.status(200).json({ status: "OK", service: "planning-api" });
});

require("./cron.js");
const ecouterNouvellesNotes = require("./realtime.js");
ecouterNouvellesNotes();

function getLastDayOfMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

app.get("/api/admin/export/:type", authenticateToken, async (req, res) => {
    const { type } = req.params;
    const { periode } = req.query;

    try {
        let tableName = "";
        let dateColumn = null;

        if (type === "presences") {
            tableName = "absences";
            dateColumn = "date_creation";
        } else if (type === "notes") {
            tableName = "notes";
            dateColumn = "date_creation";
        } else if (type === "tickets") {
            tableName = "tickets_support";
            dateColumn = "date_creation";
        } else if (type === "logs") {
            tableName = "logs";
            dateColumn = "date_creation";
        } else {
            return res.status(400).json({ error: "Type invalide." });
        }

        let query = supabase.from(tableName).select("*");

        if (periode) {
            const [year, month] = periode.split("-").map(Number);
            const lastDay = getLastDayOfMonth(year, month);
            query = query.gte(dateColumn, `${periode}-01`).lte(dateColumn, `${periode}-${lastDay}`);
        }

        const { data: records, error } = await query;
        if (error) throw error;

        if (!records || records.length === 0) {
            return res.status(200).send("Aucune donnée trouvée.");
        }

        const parser = new Parser();
        const csv = parser.parse(records);
        res.header("Content-Type", "text/csv");
        res.attachment(`${type}_export_${periode || "all"}.csv`);
        return res.send(csv);
    } catch (e) {
        console.error("Erreur Export:", e);
        res.status(500).json({ error: "Erreur serveur : " + e.message });
    }
});

app.post("/api/admin/logs", authenticateToken, async (req, res) => {
    const { action, details } = req.body;
    try {
        const { error } = await supabase.from("logs").insert([{ action, details, date_creation: new Date() }]);
        if (error) throw error;
        res.status(201).json({ status: "Log enregistré" });
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de l'enregistrement du log." });
    }
});

app.get("/api/logs", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("logs")
            .select("*")
            .order("date_creation", { ascending: false })
            .limit(200);

        if (error) throw error;
        res.status(200).json(data || []);
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de la récupération des logs." });
    }
});

app.get("/api/admin/stats/:type", authenticateToken, async (req, res) => {
    const { type } = req.params;
    try {
        if (type === "presences") {
            const { data: cours } = await supabase.from("cours").select("id, module_nom, promotion_code");
            const { data: absences } = await supabase.from("absences").select("cours_id");
            const stats = { par_promotion: {}, par_module: {} };

            cours.forEach((c) => {
                if (!stats.par_promotion[c.promotion_code]) {
                    stats.par_promotion[c.promotion_code] = { total: 0, abs: 0 };
                }
                stats.par_promotion[c.promotion_code].total++;
            });

            absences.forEach((a) => {
                const c = cours.find((x) => x.id === a.cours_id);
                if (c) stats.par_promotion[c.promotion_code].abs++;
            });

            cours.forEach((c) => {
                if (!stats.par_module[c.module_nom]) {
                    stats.par_module[c.module_nom] = { total: 0, abs: 0 };
                }
                stats.par_module[c.module_nom].total++;
            });

            absences.forEach((a) => {
                const c = cours.find((x) => x.id === a.cours_id);
                if (c) stats.par_module[c.module_nom].abs++;
            });

            const final = { par_promotion: {}, par_module: {} };
            Object.keys(stats.par_promotion).forEach((p) => {
                const s = stats.par_promotion[p];
                final.par_promotion[p] = s.total === 0 ? "0%" : `${Math.round(((s.total - s.abs) / s.total) * 100)}%`;
            });
            Object.keys(stats.par_module).forEach((m) => {
                const s = stats.par_module[m];
                final.par_module[m] = s.total === 0 ? "0%" : `${Math.round(((s.total - s.abs) / s.total) * 100)}%`;
            });

            return res.status(200).json(final);
        }

        if (type === "notes") {
            const { data: notes } = await supabase.from("notes").select("note, etudiants(promotion_code)");
            const groups = {};
            let sommeTotale = 0;

            notes.forEach((n) => {
                const promo = n.etudiants.promotion_code;
                if (!groups[promo]) groups[promo] = { somme: 0, count: 0 };
                groups[promo].somme += n.note;
                groups[promo].count++;
                sommeTotale += n.note;
            });

            const result = {
                par_promotion: {},
                moyenne_globale: notes.length > 0 ? (sommeTotale / notes.length).toFixed(2) : 0,
            };

            for (const p in groups) {
                result.par_promotion[p] = (groups[p].somme / groups[p].count).toFixed(2);
            }

            return res.status(200).json(result);
        }

        if (type === "activite") {
            const { count: tickets } = await supabase.from("tickets_support").select("*", { count: "exact", head: true });
            const { count: absences } = await supabase.from("absences").select("*", { count: "exact", head: true });
            const { count: notes } = await supabase.from("notes").select("*", { count: "exact", head: true });

            return res.status(200).json({
                tickets_en_attente: tickets,
                total_absences_enregistrees: absences,
                total_notes_enregistrees: notes,
                bot_uptime: process.uptime(),
            });
        }

        res.status(400).json({ error: "Type invalide." });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur." });
    }
});

app.get("/api/status", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Le backend d'Ingetis répond parfaitement !",
        timestamp: new Date(),
    });
});

app.get("/api/schedule/:discord_id", async (req, res) => {
    const { discord_id } = req.params;
    const { start, end } = req.query;

    try {
        const { data: etudiant } = await supabase
            .from("etudiants")
            .select("promotion_code, nom, prenom")
            .eq("discord_id", discord_id)
            .single();

        if (!etudiant) return res.status(404).json({ error: "Étudiant introuvable." });

        let query = supabase.from("cours").select("*").eq("promotion_code", etudiant.promotion_code);
        if (start && end) query = query.gte("date_cours", start).lte("date_cours", end);

        const { data: cours } = await query
            .order("date_cours", { ascending: true })
            .order("heure_debut", { ascending: true });

        res.status(200).json({
            etudiant: `${etudiant.prenom} ${etudiant.nom}`,
            promotion: etudiant.promotion_code,
            planning: cours,
        });
    } catch (err) {
        res.status(500).json({ error: "Erreur interne." });
    }
});

app.get("/api/absences/:discord_id", async (req, res) => {
    const { discord_id } = req.params;

    try {
        const { data: etudiant } = await supabase
            .from("etudiants")
            .select("id, nom, prenom")
            .eq("discord_id", discord_id)
            .single();

        if (!etudiant) return res.status(404).json({ error: "Étudiant introuvable." });

        const { data: absences } = await supabase.from("absences").select("*").eq("etudiant_id", etudiant.id);
        const { data: cours } = await supabase.from("cours").select("id, module_nom");
        const details = absences.map((abs) => ({
            ...abs,
            module_nom: cours?.find((c) => c.id === abs.cours_id)?.module_nom || "Module non spécifié",
        }));

        res.status(200).json({
            etudiant: `${etudiant.prenom} ${etudiant.nom}`,
            total_absences: details.length,
            details,
        });
    } catch (err) {
        res.status(500).json({ error: "Erreur interne." });
    }
});

app.get("/api/grades/:discord_id", async (req, res) => {
    const { discord_id } = req.params;

    try {
        const { data: etudiant } = await supabase
            .from("etudiants")
            .select("id, nom, prenom")
            .eq("discord_id", discord_id)
            .single();

        if (!etudiant) return res.status(404).json({ error: "Étudiant introuvable." });

        const { data: notes } = await supabase.from("notes").select("*").eq("etudiant_id", etudiant.id);

        res.status(200).json({
            etudiant: `${etudiant.prenom} ${etudiant.nom}`,
            notes: notes || [],
        });
    } catch (err) {
        res.status(500).json({ error: "Erreur interne." });
    }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Serveur API démarré sur le port ${PORT}`);
});

module.exports = app;
