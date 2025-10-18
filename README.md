# Momentor

Simulador docent de màquines simples desenvolupat amb React, TypeScript i Vite. Momentor permet explorar palanques, politges, polispasts, torns, masses i suports de forma analítica amb unitats SI i derivacions en format LaTeX.

## Característiques

- Models deterministes amb càlculs estàtics i cinemàtics per a:
  - Palanca (1r, 2n i 3r gènere)
  - Politja fixa i mòbil
  - Polispast
  - Torn / manovella
  - Masses puntuals, cordes i pivots
- Entorn configurable (gravetat) i validació amb **zod**.
- Derivacions pas a pas renderitzades amb **KaTeX**.
- Exportació i importació d&apos;escenes `.mtr` xifrades amb AES-GCM i una clau simètrica fixa.
- Tests unitats amb **Vitest**.
- Preparat per desplegar-se a GitHub Pages (HashRouter).

## Desenvolupament

```bash
npm install
npm run dev
```

## Tests

```bash
npm test
```

## Fitxers `.mtr`

Els fitxers es guarden com a Base64 d&apos;un paquet `[IV||ciphertext]` xifrat amb AES-GCM. La clau simètrica es troba a `src/utils/crypto.ts`.

## Llicència

MIT
