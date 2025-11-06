# AI Features Gebruikershandleiding

**ADSapp - Intelligente WhatsApp Business Inbox**

---

## Inhoudsopgave

1. [Overzicht](#overzicht)
2. [AI Instellingen](#ai-instellingen)
3. [Concept Suggesties](#concept-suggesties)
4. [Auto-Antwoorden](#auto-antwoorden)
5. [Sentiment Analyse](#sentiment-analyse)
6. [Conversatie Samenvattingen](#conversatie-samenvattingen)
7. [Template Generatie](#template-generatie)
8. [Kosten & Budget](#kosten--budget)
9. [Veelgestelde Vragen](#veelgestelde-vragen)

---

## Overzicht

ADSapp gebruikt geavanceerde Artificial Intelligence (AI) om je klantenservice te verbeteren en efficiënter te maken. Onze AI-functies helpen je om:

- ⚡ **Sneller te reageren** met intelligente antwoord suggesties
- 🤖 **24/7 beschikbaar te zijn** met automatische antwoorden
- 😊 **Klanttevredenheid te meten** met sentiment analyse
- 📝 **Overzicht te behouden** met automatische samenvattingen
- 📋 **Professioneler te communiceren** met AI-gegenereerde templates

### Voordelen

✅ **Tijdsbesparing**: Tot 40% snellere responstijd met concept suggesties
✅ **Betere service**: 24/7 automatische antwoorden buiten kantooruren
✅ **Hogere tevredenheid**: Direct urgente cases herkennen en prioriteren
✅ **Meer inzicht**: Automatische samenvattingen van alle gesprekken
✅ **Consistentie**: Professionele, on-brand communicatie

### Kosten

AI features werken op basis van daadwerkelijk gebruik:

- **Klein gebruik** (100 gesprekken/maand): €5-10/maand
- **Normaal gebruik** (1.000 gesprekken/maand): €30-50/maand
- **Intensief gebruik** (10.000 gesprekken/maand): €200-300/maand

Je betaalt alleen voor wat je gebruikt, en je kunt een maandelijks budget instellen.

---

## AI Instellingen

### Waar vind je de instellingen?

Dashboard → **Instellingen** → **AI Features**

### Basis Instellingen

#### AI Inschakelen

Hoofdschakelaar voor alle AI-functionaliteit. Als dit uit staat, worden geen AI-functies gebruikt en zijn er geen kosten.

```
☑️ AI Inschakelen
   ↳ ☑️ Concept Suggesties
   ↳ ☐ Auto-Antwoorden
   ↳ ☑️ Sentiment Analyse
   ↳ ☑️ Samenvatten
```

**Aanbeveling**: Schakel alleen de features in die je daadwerkelijk gebruikt.

#### Model Configuratie

**Primair Model**: Het AI-model dat standaard gebruikt wordt

- **Claude 3.5 Sonnet** (Aanbevolen): Beste balans tussen kwaliteit en kosten
- **Claude 3 Opus**: Hoogste kwaliteit, duurder
- **Claude 3 Haiku**: Snelste en goedkoopste optie

**Fallback Model**: Gebruikt als primair model niet beschikbaar is

- **Claude 3 Haiku** (Aanbevolen): Snelle en betrouwbare backup

**Max Tokens**: Maximale lengte van AI-antwoorden (100-4000)

- Lager = goedkoper maar kortere antwoorden
- Hoger = langere, gedetailleerde antwoorden maar duurder
- **Aanbevolen**: 1000 tokens

**Temperature**: Creativiteit van AI (0-2)

- Laag (0.3-0.5): Consistente, voorspelbare antwoorden
- Normaal (0.7): Gebalanceerd
- Hoog (1.0-2.0): Creatieve, gevarieerde antwoorden
- **Aanbevolen**: 0.7

### Budget Beheer

#### Maandelijks Budget

Stel een budget in om onverwachte kosten te voorkomen:

1. Ga naar **AI Instellingen**
2. Scroll naar **Budget Beheer**
3. Vul gewenst budget in (in USD)
4. Klik **Instellingen Opslaan**

Voorbeeld:

```
Maandelijks Budget: $50.00
Budget Waarschuwing: 80%
```

**Wat gebeurt er bij budget overschrijding?**

- Bij 80%: Je ontvangt een waarschuwing via email
- Bij 100%: AI-functies worden automatisch uitgeschakeld
- Begin volgende maand: Budget reset en functies worden weer ingeschakeld

#### Budget Tracking

Bekijk je huidige verbruik in real-time:

Dashboard → **Analytics** → **AI Analytics**

Hier zie je:

- 📊 Totaal aantal verzoeken
- 💰 Totale kosten deze maand
- ⚡ Gemiddelde response tijd
- ✅ Acceptatie rate van suggesties
- 📈 Gebruik over tijd

---

## Concept Suggesties

### Wat zijn Concept Suggesties?

AI genereert automatisch 3 verschillende antwoord suggesties op basis van de conversatie geschiedenis. Elke suggestie heeft een andere toon (professioneel, vriendelijk, empathisch).

### Hoe werkt het?

1. Open een WhatsApp conversatie in de inbox
2. Klik op de knop **"AI Suggesties"** boven het antwoordveld
3. AI analyseert de conversatie en genereert 3 suggesties
4. Kies een suggestie of pas aan naar wens
5. Klik **"Gebruiken"** om de suggestie in je antwoordveld te plaatsen

### Voorbeeld

**Klant**: "Hallo, ik heb gisteren een bestelling geplaatst maar nog geen bevestiging ontvangen. Ordernummer #12345."

**AI Suggesties**:

1. **Professioneel** (95% vertrouwen)

   > Goededag, bedankt voor uw bericht. Ik ga direct voor u controleren wat de status is van ordernummer #12345. Een moment geduld alstublieft.

2. **Vriendelijk** (92% vertrouwen)

   > Hey! Dank je wel dat je contact opneemt. Ik snap dat je graag wilt weten of alles goed is gegaan. Laat me even je order #12345 opzoeken voor je! ⏳

3. **Empathisch** (90% vertrouwen)
   > Hallo! Ik begrijp dat het vervelend is als je geen bevestiging ontvangt. Geen zorgen, ik ga meteen voor je uitzoeken wat er aan de hand is met order #12345.

### Suggesties Verbeteren

Niet helemaal tevreden met een suggestie?

1. Klik op het **potlood icoontje** bij de suggestie
2. Geef feedback: "Maak het formeler" of "Voeg kortingsaanbieding toe"
3. Klik **"Verbeteren"**
4. AI past de suggestie aan op basis van je feedback

### Best Practices

✅ **Wel**: Gebruik suggesties als startpunt en personaliseer
✅ **Wel**: Controleer feiten en details voordat je verstuurt
✅ **Wel**: Geef feedback als suggesties niet goed zijn
❌ **Niet**: Blind suggesties kopiëren zonder te lezen
❌ **Niet**: Gebruik voor gevoelige of complexe situaties zonder aanpassing

---

## Auto-Antwoorden

### Wat zijn Auto-Antwoorden?

Automatische AI-gegenereerde antwoorden die verstuurd worden als aan bepaalde voorwaarden voldaan is (bijvoorbeeld buiten kantooruren).

### Configuratie

1. Ga naar **AI Instellingen**
2. Schakel **Auto-Antwoorden** in
3. Stel voorwaarden in:

#### Voorwaarden

- ☑️ **Buiten kantooruren**: Auto-antwoord als je gesloten bent
- ☑️ **Geen agent beschikbaar**: Auto-antwoord als alle agents bezet zijn
- ☐ **Specifieke keywords**: Auto-antwoord op bepaalde woorden
- ☑️ **Lange wachttijd**: Auto-antwoord na 5 minuten wachten

#### Toon & Taal

- **Toon**: Professioneel / Vriendelijk / Casual
- **Taal**: Nederlands (standaard)

### Voorbeeld Auto-Antwoord

**Klant** (om 23:30): "Is mijn bestelling al verzonden?"

**Auto-Antwoord** (Professioneel toon):

> Goedenavond! Bedankt voor je bericht. Momenteel zijn we gesloten, maar we zijn morgen weer beschikbaar vanaf 09:00 uur. We zullen je vraag over je bestelling dan direct beantwoorden. Voor dringende zaken kun je ons bereiken via [telefoonnummer].

> Fijne avond gewenst!
> Team [Bedrijfsnaam]

### Wanneer NIET Auto-Antwoorden gebruiken?

❌ Tijdens piekuren als agents wel beschikbaar zijn
❌ Voor urgente klantenservice problemen
❌ Als personalisatie essentieel is
❌ Voor complexe vragen die menselijke beoordeling vereisen

### Best Practices

✅ Test auto-antwoorden eerst buiten kantooruren
✅ Zorg voor duidelijke verwachtingen (wanneer wel beschikbaar)
✅ Bied alternatieve contactmogelijkheden
✅ Update regelmatig op basis van feedback

---

## Sentiment Analyse

### Wat is Sentiment Analyse?

AI analyseert automatisch de emotie en urgentie van klantgesprekken, zodat je prioriteiten kunt stellen.

### Sentiment Score

**Score Range**: -1.0 (zeer negatief) tot +1.0 (zeer positief)

- **😊 Positief** (0.5 tot 1.0): Tevreden klant
- **😐 Neutraal** (-0.4 tot 0.4): Informatieve vraag
- **😞 Negatief** (-1.0 tot -0.5): Ontevreden klant
- **😕 Gemengd**: Combinatie van positief en negatief

### Urgentie Levels

- 🔵 **Laag**: Algemene vragen, geen haast
- 🟡 **Normaal**: Standaard klantenservice
- 🟠 **Hoog**: Probleem dat snel opgelost moet worden
- 🔴 **Urgent**: Kritieke situatie, directe aandacht nodig

### Waar zie je Sentiment?

1. **In de inbox**: Sentiment badge bij elke conversatie
2. **In conversatie**: Uitgebreide sentiment analyse met details
3. **In analytics**: Sentiment trends over tijd

### Voorbeeld

**Conversatie**:

> Klant: "Ik ben echt teleurgesteld, al 3 keer gebeld en nog steeds geen oplossing!"

**Sentiment Analyse**:

- **Sentiment**: 😞 Negatief
- **Score**: -0.75 (75% negatief)
- **Vertrouwen**: 92%
- **Urgentie**: 🔴 Urgent
- **Onderwerpen**: klantenservice, teleurstelling, follow-up
- **Redenering**: Klant uit frustratie over gebrek aan oplossing na meerdere contact pogingen. Emotionele taal ("echt teleurgesteld") en herhaling probleem indiceren hoge urgentie.

### Acties op basis van Sentiment

**Negatief Sentiment + Hoge Urgentie**:

1. Prioriteer dit gesprek
2. Wijs toe aan ervaren agent
3. Reageer binnen 5 minuten
4. Escaleer naar manager indien nodig

**Positief Sentiment**:

1. Vraag om review/testimonial
2. Bied cross-sell mogelijkheden
3. Deel positieve feedback met team

### Best Practices

✅ Check sentiment bij start van je shift
✅ Prioriteer negatieve gesprekken
✅ Gebruik sentiment voor team coaching
✅ Volg sentiment trends voor proces verbetering

---

## Conversatie Samenvattingen

### Wat zijn Conversatie Samenvattingen?

AI genereert automatisch een beknopte samenvatting van een volledig gesprek, inclusief actiepunten en open vragen.

### Wanneer gebruiken?

- 📝 **Agent handoff**: Nieuwe agent neemt gesprek over
- 📊 **Rapportage**: Snelle overview voor management
- 🔍 **Opvolging**: Wat is besproken en afgesproken?
- 💼 **Klantdossier**: Gesprekshistorie documenteren

### Wat bevat een samenvatting?

1. **Hoofdsamenvatting**: 2-3 zinnen over essenti van gesprek
2. **Belangrijkste punten**: Bullet points met key topics
3. **Volgende stappen**: Wat moet er nog gebeuren?
4. **Opgeloste problemen**: Wat is al opgelost?
5. **Open vragen**: Wat is nog niet beantwoord?
6. **Duur & Berichten**: Metadata van conversatie

### Voorbeeld

**Origineel Gesprek** (15 berichten over 45 minuten):

**Samenvatting**:

> Klant heeft vragen over de levering van bestelling #12345. Na controle blijkt verzending vertraagd door logistiek probleem. Track & trace code is gedeeld en bezorging wordt verwacht morgen voor 17:00. Klant is geïnformeerd en tevreden met oplossing.

**Belangrijkste Punten**:

- Bestelling #12345 vertraagd
- Logistiek probleem bij transporteur
- Track & trace: ABC123XYZ
- Verwachte levering: morgen voor 17:00

**Volgende Stappen**:

- Monitor levering morgen
- Stuur bevestiging na succesvolle bezorging
- Evalueer incident met logistiek team

**Opgeloste Problemen**:

- Onduidelijkheid over leverstatus
- Gebrek aan track & trace informatie

**Open Vragen**:

- Geen openstaande vragen

### Samenvattingen Genereren

**Handmatig**:

1. Open conversatie
2. Klik op menu **(...)**
3. Selecteer **"Samenvatten met AI"**
4. AI genereert samenvatting binnen 5 seconden

**Automatisch**:

- Samenvattingen worden automatisch gegenereerd na afsluiten gesprek
- Bekijk in conversatie details onder **"AI Samenvatting"**

### Executive Summary

Voor management: overzicht van meerdere gesprekken tegelijk.

Dashboard → **Analytics** → **Samenvattingen** → **Executive Summary**

Kies periode en ontvang:

- Totaal aantal gesprekken
- Meest voorkomende problemen
- Algemene klant sentiment
- Top actiepunten
- Trends en patronen

---

## Template Generatie

### Wat is Template Generatie?

AI genereert professionele WhatsApp Business templates die voldoen aan alle WhatsApp richtlijnen.

### Template Categorieën

1. **MARKETING**: Promoties, aanbiedingen, nieuwsbrieven
2. **UTILITY**: Bevestigingen, herinneringen, updates
3. **AUTHENTICATION**: 2FA codes, verificatie berichten

### Template Genereren

1. Ga naar **Templates** → **Nieuw Template**
2. Selecteer **"Genereren met AI"**
3. Vul in:
   - **Doel**: "Verzendbevestiging na bestelling"
   - **Toon**: Professioneel / Vriendelijk / Casual
   - **Taal**: Nederlands
   - **Max lengte**: 160 karakters
4. Klik **"Genereren"**

### Voorbeeld

**Input**:

- Doel: "Herinnering voor geplande afspraak morgen"
- Toon: Vriendelijk
- Taal: Nederlands

**Gegenereerd Template**:

```
Hoi {{1}}! 👋

Herinnering voor je afspraak morgen om {{2}} bij {{3}}.
Tot dan! ✨

Afzeggen? Reageer met STOP.
```

**Variabelen**:

- {{1}}: Klant naam
- {{2}}: Afspraak tijd
- {{3}}: Locatie

**Categorie**: UTILITY
**Geschatte Effectiviteit**: 85/100

### Template Verbeteren

Heb je al een template maar werkt deze niet goed?

1. Ga naar **Templates** → Selecteer template
2. Klik **"Verbeteren met AI"**
3. Deel performance data:
   - Open rate: 45%
   - Response rate: 12%
   - Klant feedback: "Te formeel, onduidelijk"
4. AI genereert verbeterde versie

### A/B Testing

Test welke template het beste werkt:

1. Selecteer basis template
2. Klik **"Genereer Variaties"**
3. AI maakt 3 verschillende versies
4. Test alle versies met echte klanten
5. Gebruik de best presterende versie

**Variaties kunnen verschillen in**:

- Opening (vraag vs statement)
- Emoji gebruik
- Call-to-action formulering
- Urgentie niveau

### Template Best Practices

✅ **Personaliseer** met variabelen ({{1}}, {{2}})
✅ **Kort en bondig** - maximaal 1024 karakters
✅ **Duidelijke CTA** - wat moet klant doen?
✅ **Opt-out optie** - "Afmelden? Reageer met STOP"
✅ **Test en verbeter** - gebruik analytics

❌ **Geen misleiding** - wees eerlijk over inhoud
❌ **Geen spam** - stuur alleen relevante berichten
❌ **Geen lange teksten** - gebruik bullets voor lijsten

---

## Kosten & Budget

### Hoe worden kosten berekend?

Kosten zijn gebaseerd op:

1. **Model**: Claude 3.5 Sonnet ($3/miljoen tokens) vs Claude 3 Haiku ($0.25/miljoen tokens)
2. **Tokens**: Aantal woorden/karakters verwerkt
3. **Feature**: Sommige features gebruiken meer tokens

### Kosten per Feature

**Concept Suggesties**: $0.003 - $0.01 per suggestie
**Auto-Antwoord**: $0.002 - $0.005 per antwoord
**Sentiment Analyse**: $0.001 - $0.003 per analyse
**Samenvatting**: $0.005 - $0.015 per conversatie
**Template Generatie**: $0.01 - $0.03 per template

### Kosten Optimalisatie Tips

1. **Gebruik Haiku voor eenvoudige taken**
   - Sentiment analyse
   - Korte auto-antwoorden
   - Template variaties

2. **Beperk Max Tokens**
   - Lagere limiet = lagere kosten
   - 500 tokens is vaak voldoende

3. **Budget Alerts**
   - Ontvang waarschuwing bij 80% verbruik
   - Voorkom budget overschrijding

4. **Selectief Inschakelen**
   - Alleen features die je gebruikt
   - Zet ongebruikte features uit

5. **Batch Operaties**
   - Samenvattingen 1x per dag in plaats van realtime
   - Bulk template generatie

### Budget Monitoring

Bekijk gedetailleerde kosten breakdown:

Dashboard → **AI Analytics**

Hier zie je:

- 💰 Kosten per feature
- 📊 Gebruik over tijd
- 🎯 Kosten per model
- 📈 Budget voortgang

---

## Veelgestelde Vragen

### Algemeen

**Q: Worden mijn klantgesprekken opgeslagen door AI?**
A: Nee, AI verwerkt gesprekken alleen tijdelijk. Samenvattingen en analyses worden in je database opgeslagen, maar originele berichten blijven privé.

**Q: Kan AI in het Nederlands werken?**
A: Ja! Alle AI features ondersteunen Nederlands. Je kunt de taal instellen in de configuratie.

**Q: Wat als AI een fout maakt?**
A: AI genereert suggesties, geen definitieve antwoorden. Controleer altijd voor verzending. Je blijft verantwoordelijk voor communicatie met klanten.

**Q: Kan ik AI uitschakelen?**
A: Ja, schakel de hoofdschakelaar uit in AI Instellingen. Dit stopt alle AI verwerking en kosten.

### Concept Suggesties

**Q: Waarom krijg ik maar 2 suggesties in plaats van 3?**
A: Als de conversatie te kort is, kan AI soms minder suggesties genereren. Meer context = betere suggesties.

**Q: Kan ik de toon van suggesties aanpassen?**
A: Ja, gebruik de "Verbeteren" functie en geef feedback zoals "Maak het formeler" of "Gebruik meer emoji's".

**Q: Hoe lang duurt het genereren van suggesties?**
A: Gemiddeld 2-5 seconden, afhankelijk van conversatie lengte en gekozen model.

### Auto-Antwoorden

**Q: Worden auto-antwoorden automatisch verstuurd?**
A: Alleen als je dit expliciet instelt. Standaard worden ze gegenereerd maar niet verzonden zonder goedkeuring.

**Q: Kan ik verschillende auto-antwoorden voor verschillende situaties?**
A: Ja, configureer meerdere voorwaarden (buiten kantooruren, hoge wachttijd, specifieke keywords).

**Q: Wat als een auto-antwoord verkeerde informatie bevat?**
A: Je kunt elke auto-antwoord reviewing voordat verzending. Schakel "Goedkeuring vereist" in.

### Sentiment Analyse

**Q: Hoe nauwkeurig is sentiment analyse?**
A: Gemiddeld 85-95% accuraat, afhankelijk van duidelijkheid van de taal. Check altijd het confidence level.

**Q: Kan sentiment over tijd veranderen in een gesprek?**
A: Ja! Gebruik "Sentiment Trend" om te zien hoe sentiment evolueert tijdens conversatie.

**Q: Werkt het ook voor emoji's en informele taal?**
A: Ja, AI begrijpt emoji's, spreektaal en WhatsApp-specifieke communicatie.

### Templates

**Q: Moet ik templates eerst laten goedkeuren door WhatsApp?**
A: Ja, alle WhatsApp Business templates moeten goedgekeurd worden. AI genereert compliant templates, maar WhatsApp review is verplicht.

**Q: Kan AI templates in meerdere talen genereren?**
A: Ja, specificeer gewenste taal bij generatie (Nederlands, Engels, Duits, etc.).

**Q: Hoeveel variaties kan ik tegelijk genereren?**
A: Standaard 3 variaties, maar je kunt dit aanpassen tot 10 variaties voor uitgebreide A/B testing.

### Kosten & Budget

**Q: Wat gebeurt er als ik mijn budget bereik?**
A: AI features worden automatisch gepauzeerd. Begin volgende maand worden ze weer geactiveerd.

**Q: Kan ik kosten terugzien per agent?**
A: Momenteel alleen op organisatie niveau. Per-agent tracking komt in volgende update.

**Q: Zijn er gratis trials beschikbaar?**
A: Ja! Nieuwe accounts krijgen $10 gratis credit om AI features te testen. Geen credit card vereist.

### Technisch

**Q: Welk AI model wordt gebruikt?**
A: Standaard Claude 3.5 Sonnet van Anthropic. Je kunt ook GPT-4 of andere modellen kiezen.

**Q: Waar worden AI responses opgeslagen?**
A: In je eigen Supabase database met Row Level Security. Alleen jouw team heeft toegang.

**Q: Wat als de AI service offline is?**
A: Fallback model wordt automatisch gebruikt. Als beide offline zijn, krijg je een notificatie en schakel je terug naar handmatige mode.

---

## Hulp Nodig?

**Technische Support**:
Email: support@adsapp.nl
Chat: Via dashboard (rechtsboven)

**Documentatie**:
Technische docs: `/docs/AI_TECHNICAL_DOCUMENTATION.md`
API Reference: `/docs/API_REFERENCE_AI.md`

**Community**:
Forum: community.adsapp.nl
Discord: discord.gg/adsapp

---

**Laatste update**: 2025-11-05
**Versie**: 1.0.0
