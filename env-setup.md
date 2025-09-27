# Environment Setup voor ADSapp

## Stap 1: Maak .env.local bestand aan

Maak een nieuw bestand genaamd `.env.local` in de root directory van je project met de volgende inhoud:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://egaiyydjgeqlhthxmvbn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnYWl5eWRqZ2VxbGh0aHhtdmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzM4NjQsImV4cCI6MjA3NDQwOTg2NH0.dX7gwwqk5gVY6NJWec8Gr2CfbxyxJhp0gkx6-SWl7oQ

# Database Configuration (voor server-side operaties)
SUPABASE_SERVICE_ROLE_KEY=jouw_service_role_key_hier
DATABASE_URL=postgresql://postgres.egaiyydjgeqlhthxmvbn:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

## Stap 2: Vul je database wachtwoord in

1. Ga naar je Supabase Dashboard: https://supabase.com/dashboard/project/egaiyydjgeqlhthxmvbn
2. Ga naar Settings > Database
3. Kopieer je database wachtwoord
4. Vervang `[YOUR-PASSWORD]` in de DATABASE_URL met je echte wachtwoord

## Stap 3: Service Role Key (optioneel)

Voor server-side operaties heb je mogelijk de service role key nodig:
1. Ga naar Settings > API in je Supabase Dashboard
2. Kopieer de "service_role" key (niet de anon key!)
3. Vervang `jouw_service_role_key_hier` met de echte service role key

## Stap 4: Herstart je development server

Na het aanmaken van het .env.local bestand:

```bash
npm run dev
```

## Troubleshooting

Als je nog steeds errors krijgt:

1. **Controleer of .env.local in de root directory staat** (naast package.json)
2. **Herstart je development server** na het aanmaken van .env.local
3. **Controleer of alle environment variables correct zijn gespeld**
4. **Zorg dat er geen spaties zijn rond de = tekens**

## Database Schema Update

De database schema is bijgewerkt om de registratie problemen op te lossen:

1. **Trigger functie gefixt**: `handle_new_user()` maakt nu correct een profiel aan
2. **RLS policy toegevoegd**: Gebruikers kunnen nu hun eigen profiel aanmaken
3. **Organization_id nullable**: Wordt later ingesteld door de applicatie

Om de database bij te werken, voer een van deze scripts uit:
- `node apply-schema-direct.js` (als je het database wachtwoord hebt ingevuld)
- Of kopieer de inhoud van `supabase-clean-schema.sql` naar de Supabase SQL Editor
