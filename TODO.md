# TODO - Popups Expérience Académique & Projets

## Fichiers concernés
- `index.html` (template popup + styles inline déjà présents)
- `script.js` (logique JS à corriger)

## Étapes Identifiées
- [ ] 1. Corriger la logique conditionnelle `isMarlink` / `isFortinet` dans `script.js` (else if incorrect)
- [ ] 2. Corriger l'extension d'image Fortinet (`NSE3-Certification.png`)
- [ ] 3. S'assurer que le contenu texte s'affiche pour tous les cas de popups
- [ ] 4. Vérifier/ajouter le style `overflow: hidden` sur `body` lorsqu'une popup est ouverte

## Les bugs identifiés

1. `isFortinet` est **imbriqué** dans `isMarlink` au lieu d'être `else if` → le contenu texte ne s'affiche jamais
2. L'image Fortinet manque l'extension `.png`
3. Le texte de popup pour les projets/experiences non-Marlink/non-Fortinet n'est pas rendu correctement

## Stade actuel d'implémentation
- Les cartes `.project-card` et `.timeline-item` ont déjà `data-en-popup-title`, `data-fr-popup-title`, `data-en-popup-text`, `data-fr-popup-text`
- Le template `<template id="popupTemplate">` est déjà dans `index.html`
- Les styles `.popup-modal`, `.popup-backdrop`, `.popup-card`, etc. sont déjà dans le `<style>` de `index.html`
- La fonction `createPopup()` existe mais contient le bug de logique

## Corrections nécessaires

### script.js
- Transformer la condition imbriquée `if (isMarlink) { if (isFortinet) {...} else {...} }`  
  en `if (isMarlink) {...} else if (isFortinet) {...} else {...}`
- Ajouter `popupContent.innerHTML = text.replace(...) au bon endroit dans chaque branche`
- Corriger `logo.src = './NSE3-Certification'` → `logo.src = './NSE3-Certification.png'`

### index.html
- Ajouter dans le `<style>` une règle `body.modal-open { overflow: hidden; }`

