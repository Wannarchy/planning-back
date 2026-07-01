const crypto = require("node:crypto");
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const authenticateToken = require("../middleware/auth.js");
const { verifyDiscordAdmin } = require("../function/verifyDiscordAdmin.js");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET n'est pas défini dans les variables d'environnement.");
    process.exit(1);
}

const CLIENT_ID = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI =
    process.env.DISCORD_REDIRECT_URI ||
    `http://localhost:${process.env.PORT || 8080}/api/auth/discord/callback`;
const FRONT_URL = process.env.FRONT_URL || process.env.CORS_ORIGIN || "http://localhost:5173";

function redirectWithError(res, reason) {
    return res.redirect(`${FRONT_URL}/auth/callback?error=${encodeURIComponent(reason)}`);
}

router.get("/me", authenticateToken, (req, res) => {
    res.json({
        message: "Profil récupéré avec succès",
        user: req.user,
    });
});

router.post("/logout", (req, res) => {
    return res.json({ message: "Déconnexion réussie. Veuillez supprimer le token côté client." });
});

router.get("/discord", (req, res) => {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        return res.status(500).json({ error: "OAuth Discord non configuré (CLIENT_ID / DISCORD_CLIENT_SECRET)." });
    }

    const state = jwt.sign(
        { n: crypto.randomBytes(16).toString("hex") },
        JWT_SECRET,
        { expiresIn: "10m" }
    );

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: "code",
        scope: "identify",
        state,
    });

    return res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

router.get("/discord/callback", async (req, res) => {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
        return redirectWithError(res, String(oauthError));
    }
    if (!code || !state) {
        return redirectWithError(res, "missing_params");
    }

    try {
        jwt.verify(state, JWT_SECRET);
    } catch {
        return redirectWithError(res, "invalid_state");
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
        return redirectWithError(res, "oauth_not_configured");
    }

    try {
        const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: "authorization_code",
                code: String(code),
                redirect_uri: REDIRECT_URI,
            }),
        });

        if (!tokenRes.ok) {
            console.error("Échec échange token Discord :", await tokenRes.text());
            return redirectWithError(res, "token_exchange");
        }

        const tokens = await tokenRes.json();
        const userRes = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        if (!userRes.ok) {
            return redirectWithError(res, "user_fetch");
        }

        const discordUser = await userRes.json();
        const verification = await verifyDiscordAdmin(discordUser.id);

        if (!verification.ok) {
            return redirectWithError(res, verification.reason);
        }

        const token = jwt.sign(
            {
                discord_id: discordUser.id,
                username: discordUser.username,
                global_name: discordUser.global_name || discordUser.username,
                avatar: discordUser.avatar,
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        return res.redirect(`${FRONT_URL}/auth/callback?token=${encodeURIComponent(token)}`);
    } catch (err) {
        console.error("Erreur callback OAuth Discord :", err);
        return redirectWithError(res, "server_error");
    }
});

module.exports = router;
