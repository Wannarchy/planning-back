const http = require("node:http");

function lireBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => {
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString() || "{}"));
            } catch {
                reject(new Error("JSON invalide"));
            }
        });
        req.on("error", reject);
    });
}

function startBotServer(client) {
    const port = Number(process.env.BOT_PORT || 3001);

    const server = http.createServer(async (req, res) => {
        const pathname = (req.url || "/").split("?")[0];

        res.setHeader("Content-Type", "application/json");

        if (req.method === "GET" && pathname === "/health") {
            const pret = client.isReady();
            res.writeHead(200);
            res.end(JSON.stringify({
                status: "OK",
                service: "discord-bot",
                discord: pret
                    ? { connected: true, tag: client.user.tag, id: client.user.id }
                    : { connected: false },
            }));
            return;
        }

        if (req.method === "POST" && pathname === "/send-alert") {
            if (!client.isReady()) {
                res.writeHead(503);
                res.end(JSON.stringify({ error: "Bot Discord non connecté" }));
                return;
            }

            try {
                const { channelId, message } = await lireBody(req);
                if (!channelId || !message) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: "channelId et message requis" }));
                    return;
                }

                const channel = await client.channels.fetch(channelId);
                if (!channel || !channel.isTextBased()) {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: "Salon introuvable" }));
                    return;
                }

                await channel.send(message);
                res.writeHead(200);
                res.end(JSON.stringify({ status: "envoyé" }));
            } catch (err) {
                console.error("Erreur send-alert :", err.message);
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: "Route introuvable" }));
    });

    server.listen(port, "0.0.0.0", () => {
        console.log(`🌐 Serveur HTTP bot sur le port ${port} (/health, /send-alert)`);
    });

    return server;
}

module.exports = { startBotServer };
