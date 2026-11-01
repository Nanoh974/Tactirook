# Confidentialité et gestion des données

[English](./PRIVACY.md)

Ce document décrit le code source actuel ; il ne constitue pas une garantie
concernant les versions futures ou les variantes créées par des tiers.

## Données conservées sur votre appareil

L'application stocke les préférences et l'historique des problèmes à l'aide
d'AsyncStorage : stockage du navigateur sur le Web et stockage de l'application
sur les plateformes natives.

- Langue, apparence, couleurs et position de l'échiquier, et jeu de pièces choisi.
- Thèmes sélectionnés, informations masquées sur les problèmes et passage automatique.
- Autorisation de répéter les problèmes et historique compact des problèmes vus.

Le code de Tactirook n'intègre actuellement ni compte utilisateur, ni
synchronisation dans le cloud, ni SDK publicitaire, ni outil d'analyse, ni
service d'envoi des parties. L'application lit les réglages de langue de
l'appareil pour choisir la langue initiale.

Le stockage local n'est pas un coffre-fort sécurisé et ne doit pas servir à
conserver des données sensibles. Le stockage du navigateur peut être effacé
ou indisponible ; sur les plateformes natives, la sauvegarde et la restauration
dépendent du système d'exploitation.

## Requêtes réseau

L'application Web télécharge son JavaScript, ses polices et ses fichiers de
problèmes depuis son site d'hébergement. Les problèmes qui ne sont pas en cache
nécessitent une connexion. L'hébergeur peut traiter les informations habituelles
des requêtes, comme les adresses IP et les en-têtes du navigateur, selon ses
propres règles.

Les versions natives exportées incluent les ressources des problèmes. Les
sessions de développement avec Expo Go chargent les ressources depuis le serveur
de développement et peuvent faire appel aux services d'Expo. Tactirook
n'interroge pas l'API de Lichess pendant le jeu.

L'ouverture des liens vers les sources et les crédits mène à des services
externes, notamment GitHub et Lichess, qui disposent de leurs propres politiques
de confidentialité. Les outils de développement et les signalements GitHub sont
également distincts des préférences de l'application stockées localement.

## Effacer les données et signaler un problème

Utilisez **Réinitialiser les problèmes vus** pour effacer l'historique des
problèmes ; cette action ne réinitialise pas les autres préférences. Sur le Web,
effacez les données du site dans le navigateur pour supprimer tous les réglages
locaux. Sur les plateformes natives, utilisez les commandes de gestion du
stockage du système ; le comportement après désinstallation ou restauration
peut dépendre des sauvegardes.

## Contact

Pour toute question relative à la confidentialité, ouvrez une
[issue GitHub](https://github.com/Nanoh974/Tactirook/issues) afin de demander
un moyen de contact privé. Les issues sont publiques : n'y indiquez aucune
information personnelle ou sensible. Signalez les vulnérabilités de sécurité
ou de confidentialité conformément à la [politique de sécurité](../SECURITY.md).
