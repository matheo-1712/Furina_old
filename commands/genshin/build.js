const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const cheerio = require('cheerio');
const { imgLink, api } = require('../../configLink.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('build')
        .setDescription('Permet de consulter un guide de build pour un personnage.')
        .addStringOption(option =>
            option.setName('character')
                .setDescription('Le nom du personnage pour lequel vous souhaitez consulter un guide de build.')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {

        // Récupérer la valeur saisie par l'utilisateur
        const focusedValue = interaction.options.getFocused();
        const ApiLink = api.charactersList;
        let name = '';
        let value = '';

        try {
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(ApiLink);

            if (!response.ok) {
                console.error(`[ERROR] Erreur HTTP : ${response.status}`);
                throw new Error(`[ERROR] Erreur HTTP : ${response.status}`);
            }

            const data = await response.json();
            // console.log('[INFO] Les données sont récupérées avec succès ', data);

            // Filtrer les éléments qui sont des chaînes valides
            const validData = data.filter(element => typeof element === 'string' && element.trim() !== '');

            // Générer les choix avec vérification de la longueur du nom
            const choices = validData.map(element => {
                const nameDefault = element;
                const input = nameDefault;
                if (nameDefault === 'yun-jin') {
                    name = 'yun-jin'
                } else if (nameDefault === 'anemo-traveler') {
                    name = 'Voyageur-Anemo';
                    value = 'anemo-traveler';
                } else if (nameDefault === 'geo-traveler') {
                    name = 'Voyageur-Géo';
                    value = 'geo-traveler';
                } else if (nameDefault === 'hydro-traveler') {
                    name = 'Voyageur-Électro';
                    value = 'electro-traveler';
                } else if (nameDefault === 'electro-traveler') {
                    name = 'Voyageur-Dendro';
                } else {
                    name = input.replace(/^.*?-(.*)$/, '$1');
                    value = name;
                }
                // Tronquer le nom si la longueur dépasse 25 caractères et mettre une majuscule au début du nom
                const truncatedName = name.length > 25 ? name.substring(0, 25) : name.charAt(0).toUpperCase() + name.slice(1);

                // Tronquer la valeur si la longueur dépasse 25 caractères
                const truncatedValue = value.length > 25 ? value.substring(0, 25) : value;

                return {
                    name: truncatedName,
                    value: truncatedValue
                };
            });

            // Filtrer les choix en fonction de l'entrée utilisateur, insensible à la casse
            const filtered = choices.filter(choice =>
                choice.name.toLowerCase().startsWith(focusedValue.toLowerCase())
            );

            // Limiter les résultats à 25
            const limitedFiltered = filtered.slice(0, 25);

            // S'il n'y a pas de correspondance ou si l'utilisateur n'a rien saisi
            if (limitedFiltered.length === 0) {
                let noMatchMessage = '';

                if (focusedValue.length === 0) {
                    noMatchMessage = 'Tapez pour chercher un personnage...';
                } else {
                    noMatchMessage = 'Aucune correspondance trouvée.';
                }

                await interaction.respond([
                    {
                        name: noMatchMessage,
                        value: 'none'
                    }
                ]);
            } else {
                await interaction.respond(limitedFiltered);
            }

        } catch (error) {
            console.error('[ERROR] Erreur lors de la récupération des données pour l\'autocomplétion : ', error);
            await interaction.respond([
                {
                    name: 'Error',
                    value: 'Une erreur est survenue !'
                }
            ]).catch(err => console.error('[ERROR] Erreur lors de la réponse à l\'interaction : ', err));
        }
    },

    async execute(interaction) {

        const character = interaction.options.getString('character');

        // Variables pour le nom d'affichage du personnage et la couleur de l'embed
        let persoAffichage = character.charAt(0).toUpperCase() + character.slice(1);

        let linkGuide = `https://keqingmains.com/q/${character}-quickguide/`
        try {
            // Envoyer une requête à la page de guide de build pour le personnage spécifié
            let response = await fetch(linkGuide);

            if (!response.ok) {
                // Vérifier si le statut est 404 ou un autre code d'erreur
                if (response.status === 404) {

                    linkGuide = `https://keqingmains.com/${character}/`;

                    // console.log('Error 404: Passage sur un lien alternatif...');
                    // console.log('Nouveau lien:', linkGuide);

                    // Envoyer une nouvelle requête avec le lien alternatif
                    response = await fetch(linkGuide);

                    if (!response.ok) {
                        if (response.status === 404) {
                            // console.log('Error 404: Page not found');
                            linkGuide = 'Aucun guide de build n\'a été trouvé pour ce personnage.';
                            throw new Error('Error 404: Page not found');
                        } else {
                            console.log('HTTP Error:', response.status);
                            throw new Error('HTTP Error: ' + response.status);
                        }
                    }
                } else {
                    // console.log('HTTP Error:', response.status);
                    throw new Error('HTTP Error: ' + response.status);
                }
            }
            const guideImgLink = await guideImg(linkGuide);

            // Gestion des noms d'affichage des personnages

            switch (character) {
                case 'anemo-traveler':
                    persoAffichage = 'du Voyageur Anemo';
                    break;
                case 'geo-traveler':
                    persoAffichage = 'du Voyageur Géo';
                    break;
                case 'electro-traveler':
                    persoAffichage = 'du Voyageur Électro';
                    break;
                case 'dendro-traveler':
                    persoAffichage = 'du Voyageur Dendro';
                    break;
                case 'hydro-traveler':
                    persoAffichage = 'du Voyageur Hydro';
                    break;

                default:
                    persoAffichage = 'de ' + character.charAt(0).toUpperCase() + character.slice(1);
                    break;
            }

            // Gestion de la couleur des embeds
            const color = await colorChar(character);

            // Gestion de la petite image de l'embed


            // Répondre à l'interaction

            const embed = new EmbedBuilder()
                .setAuthor({
                    name: "Furina - Genshin Impact",
                })
                .setTitle(`Build ${persoAffichage}`)
                .setURL(linkGuide)
                .setImage(guideImgLink)
                .setDescription(`Voici un guide de build pour ${persoAffichage}.\nPour avoir accès à un guide plus complet, [ici](${linkGuide}).`)
                .setColor(color)
                .setFooter({
                    text: "Crédit : Keqingmains",
                })
                .setTimestamp();

            console.log(`${imgLink.characterPortrait}${persoAffichage}.png`)
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[ERROR] Erreur lors de la récupération des données ou de la réponse à l\'interaction : Personnage non trouvé.');
            // Répondre à l'interaction
            const embed = new EmbedBuilder()
                .setTitle(`Mince, une erreur est survenue !`)
                .setDescription(`Aucun guide de build n'a été trouvé pour **${persoAffichage}**.\n Vous n'avez pas saisi le bon nom de personnage ou il n'y a pas de guide de build pour ce personnage.\n\n __Si ce n'est pas le cas, veuillez contacter rerebleue.__`)
                .setImage(imgLink.error)
                .setColor("#FF0000")
                .setFooter({
                    text: "Furina - Genshin Impact",
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] }).catch(err => console.error('[ERROR] Erreur lors de la réponse à l\'interaction : ', err));
        }

    }
};

async function guideImg(url) {

    try {
        // Envoyer une requête HTTP pour récupérer le contenu de la page
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        // Convertir la réponse en texte
        const html = await response.text();

        // Utiliser cheerio pour parser le HTML
        const $ = cheerio.load(html);

        const searchTerm = 'Infographic';

        // Trouver le h1 contenant un span avec le mot "Infographic"
        const h1WithSearchTerm = $('h1').filter((i, el) => {
            return $(el).text().includes(searchTerm);
        });

        // Si le h1 est trouvé, trouver la première image après ce h1
        let imageSrc;
        if (h1WithSearchTerm.length > 0) {
            // Chercher la première image dans la div suivante après le h1
            const image = h1WithSearchTerm.first().next('div').find('img').first();

            if (image.length > 0) {
                imageSrc = image.attr('src');
            } else {
                // console.log('Aucune image trouvée après le h1 contenant le mot Infographic.');
            }
        } else {
            // console.log('Aucun h1 contenant le mot Infographic trouvé.');
        }

        if (imageSrc) {
            // console.log('URL de l\'image trouvée:', imageSrc);
            return imageSrc;
        } else {
            // console.log('Aucune image trouvée avec le terme recherché, lancement de la recherche d\'une image alternative...');
            // Chercher toutes les balises <img> et filtrer celles dont l'attribut src contient le terme recherché
            const searchTerm = 'Infographic';
            const image = $('img').filter((i, el) => {
                const src = $(el).attr('src');
                return src && src.includes(searchTerm); // Ajouter une vérification pour src
            }).first();

            // Extraire l'attribut src de la première image trouvée
            const imageSrc = image.attr('src');
            if (imageSrc) {
                // console.log('URL de l\'image trouvée:', imageSrc);
                return imageSrc;
            } else {
                // console.log('Aucune image trouvée avec le terme recherché.');
                return imgLink.noInfographics;
            }
        }
    } catch (error) {
        console.error('Erreur lors de la récupération ou de l\'extraction:', error);
    }
}

async function colorChar(character) {

    // Gestion de la couleur des embeds

    const ApiCharDetails = api.charactersDetails;
    let color;

    // Structure de données pour les personnages
    /*
    {
    "page": 1,
    "results": [
        {
        "id": 1,
        "name": "Amber",
        "rarity": "4_star",
        "weapon": "Bow",
        "vision": "Pyro",
        "wiki_url": "https://genshin-impact.fandom.com/wiki/Amber"
        }
    ],
    "total_results": 1,
    "total_pages": 1,
    "supported_attributes": "name, rarity, weapon, vision, model_type, region"
    }
    */

    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(ApiCharDetails + character.charAt(0).toUpperCase() + character.slice(1));

        // console.log('URL de l\'API:', ApiCharDetails + character.charAt(0).toUpperCase() + character.slice(1));

        if (!response.ok) {
            console.error(`[ERROR] Erreur HTTP : ${response.status}`);
            throw new Error(`[ERROR] Erreur HTTP : ${response.status}`);
        }

        const data = await response.json();

        // Récupération de la vision
        const vision = data.vision;
        console.log('Vision:', vision);


        // Déterminer la couleur de l'embed en fonction de la vision
        switch (vision) {
            case 'Pyro':
                color = '#FF0000';
                break;
            case 'Hydro':
                color = '#0000FF';
                break;
            case 'Anemo':
                color = '#00FF00';
                break;
            case 'Electro':
                color = '#6b32a8';
                break;
            case 'Cryo':
                color = '#00FFFF';
                break;
            case 'Geo':
                color = '#FFA500';
                break;
            case 'Dendro':
                color = '#008000';
                break;
            default:
                color = '#FFFFFF';
                break;
        }

        return color;

    } catch (error) {
        console.error('[ERROR] Erreur lors de la récupération des données pour la couleur : ', error);
        color = '#FFFFFF';

        return color;
    }
}