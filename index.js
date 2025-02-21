// Dépendances du bot

const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { token } = require('./config.json');

const deployCommands = require('./deploy-commands');

// Dépendances de l'API
const characterRoutes = require('./api/routes/characterRoutes');
const express = require('express');
const app = express();
const port = 8081;

// Dossier où les portraits sont stockés
const imagesDirPortrait = path.join(__dirname, 'api/img/portraits');

// Dossier où les infographies sont stockées
const imagesDirInfographie = path.join(__dirname, 'api/img/infographies');

// Créer un nouveau client Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
client.cooldowns = new Collection();

// Récupérer les commandes
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Ajouter les commandes à la collection
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[AVERTISSEMENT] La commande à ${filePath} manque une propriété "data" ou "execute" requise.`);
		}
	}
}

// Récupérer les événements
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

// Charger les événements
for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	// console.log(`[INFO] Chargement de l'événement : ${event.name}`);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// Déploiement des commandes
deployCommands();

// Connexion du client
client.login(token);

// Gestion de l'API
app.use(express.json()); // Pour les données JSON
app.use(express.urlencoded({ extended: true })); // Pour les données URL encodées

// Renvoie si l'API est en ligne
app.get('/', (req, res) => {
    res.json({ status: 'API en ligne' });
});

// Renvoie si le bot est en ligne
app.get('/furina', (req, res) => {
    res.json({ status: 'Furina est en ligne' });
});

// Route pour accéder aux images
app.use('/portrait', express.static(imagesDirPortrait));

// Route pour accéder aux infographies
app.use('/infographie', express.static(imagesDirInfographie));

// Routes pour l'API qui gère les personnages
app.use('/api', characterRoutes);

// Démarrage du serveur
app.listen(port, () => {
    // console.log(`Serveur démarré sur http://localhost:${port}`);
});

app.use((req, res) => {
    res.status(404).send('Page introuvable');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Une erreur est survenue sur le serveur');
});
