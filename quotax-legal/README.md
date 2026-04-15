# QuotaX — Pagine Legali

File HTML per Privacy Policy e Termini e Condizioni.
Da pubblicare su GitHub Pages con dominio custom quotax.bet.

## Come pubblicare su GitHub Pages

### 1. Crea repository su GitHub
- Vai su https://github.com/new
- Nome: `quotax-legal` (o `quotax.bet`)
- Pubblico
- Clicca "Create repository"

### 2. Carica i file
- Clicca "Upload files"
- Trascina tutti i file HTML + questo README
- Clicca "Commit changes"

### 3. Attiva GitHub Pages
- Vai su Settings > Pages
- Source: "Deploy from a branch"
- Branch: main, / (root)
- Clicca Save
- Aspetta 1-2 minuti

### 4. URL disponibili (senza dominio custom)
- https://TUO-USERNAME.github.io/quotax-legal/
- https://TUO-USERNAME.github.io/quotax-legal/privacy.html
- https://TUO-USERNAME.github.io/quotax-legal/terms.html

### 5. (Opzionale) Collegare dominio quotax.bet
- In Settings > Pages > Custom domain: inserisci `quotax.bet`
- Nel DNS del dominio (Namecheap), aggiungi:
  - CNAME record: `www` -> `TUO-USERNAME.github.io`
  - A records:
    - 185.199.108.153
    - 185.199.109.153
    - 185.199.110.153
    - 185.199.111.153
- Attiva "Enforce HTTPS"
- Risultato:
  - quotax.bet -> Homepage
  - quotax.bet/privacy -> Privacy Policy
  - quotax.bet/terms -> Termini e Condizioni
