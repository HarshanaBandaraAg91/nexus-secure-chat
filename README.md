# NEXUS // Private Real-Time Encrypted Messaging Terminal

> **Production-ready, cyber-security-themed private real-time 1-to-1 messaging web application with native browser Web Crypto AES-256-GCM End-to-End Encryption (E2EE), strict 4-layer architectural separation, custom deterministic visual cipher layer, Supabase PostgreSQL / Realtime backend, and Netlify deployment.**

---

## 1. Security Architecture: The 4-Layer Separation

NEXUS enforces a strict, uncompromising separation between room access authentication, cryptographic encryption, and visual presentation:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          1. ROOM CODE (e.g. 434)                       │
│    • Identifies the enclave channel in routing and database lookup     │
│    • Public identifier; NEVER acts as an encryption key                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        2. ACCESS CODE (e.g. 2266)                      │
│    • 4-digit code that authorizes membership entry                     │
│    • Validated via salted SHA-256 verifier hash                        │
│    • NEVER acts as the AES key; NEVER directly decrypts messages       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               3. CRYPTOGRAPHIC ROOM KEY (AES-256-GCM 256-bit)          │
│    • 256-bit CSPRNG key generated via native Web Crypto API            │
│    • NEVER derived directly from 4-digit codes                         │
│    • Encrypts & decrypts messages with unique 96-bit random IVs        │
│    • ZERO plaintext transmitted or stored in database                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 4. CUSTOM VISUAL CIPHER KEY (e.g. 16 -> P)             │
│    • Reversible Caesar substitution layer (e.g. amma <-> pbbp)         │
│    • Strictly client-side visual presentation & educational HUD        │
│    • NOT a replacement for cryptographic encryption                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Comparison of the 4 Distinct Layers

| Layer | Concept | Function | Storage / Security Properties |
| :--- | :--- | :--- | :--- |
| **Layer 1** | **Room Code** | Channel Identification (`434`) | Public routing index. Never used as an encryption key. |
| **Layer 2** | **Access Code** | Membership Authorization (`1133`, `2266`) | Salted SHA-256 verifier. Authorizes entry; does NOT decrypt messages. |
| **Layer 3** | **Cryptographic Key** | True AES-256-GCM E2EE | 256-bit Web Crypto CSPRNG key. Protected via key envelopes; never stored in plaintext. |
| **Layer 4** | **Visual Cipher Key** | Visual Substitution HUD (`16 → P`) | Client-side Caesar shift (`pbbp` $\leftrightarrow$ `amma`). Presentation only. |

---

## 3. Message Transmission & Local Decryption Flow

```
SENDER (Bob):
User types: "amma"
    ↓
Visual Cipher Layer (Shift 16 / 'P'):
"amma" → "pbbp"
    ↓
Native Web Crypto API (256-bit AES-GCM + Unique 12-byte IV):
"pbbp" → Base64 Ciphertext: "7e9b1a..." (IV: "b3f09a...")
    ↓
Supabase Database / Realtime Wire:
Only Ciphertext + IV stored/transmitted. Plaintext is NEVER sent.

RECEIVER (Lal):
Supabase Realtime Payload: { ciphertext, iv }
    ↓
Local Web Crypto AES-256-GCM Decryption (using Master Room Key):
Ciphertext → "pbbp"
    ↓
Visual UI displays: "pbbp" with [ 🔓 DECRYPT ]
    ↓
Receiver enters Visual Cipher Key: 16 (or 2266)
    ↓
Visual Cipher Reverse:
"pbbp" → "amma" (Plaintext revealed in browser)
```

---

## 4. Key Management & Storage Audit

- **No Plaintext Key Exposure:** Cryptographic keys are never written to `localStorage`, `sessionStorage`, URLs, query parameters, HTML source, or `console.log`.
- **Key Wrapping & Unwrapping:** When creating a room, the master 256-bit AES-GCM key is wrapped with a 256-bit Key Wrapping Key (KWK) derived using PBKDF2 (100,000 iterations of SHA-256) and a unique cryptographic salt.
- **Unique IV / Nonce Guarantee:** Every single message uses a freshly generated 12-byte IV (`crypto.getRandomValues`), preventing nonce-reuse attacks.
- **Historical Message Access:** Encrypted messages stored in Supabase remain encrypted under the room's master key. Only clients in possession of the room's cryptographic master key can decrypt historical messages.

---

## 5. Technology Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Audio Synthesizer:** Native Web Audio API procedural sound engine (0 external sound assets).
- **Backend / Realtime:** Supabase (PostgreSQL 15+, Supabase Realtime WebSocket Channels, Row Level Security).
- **Cryptography:** Native W3C Web Crypto API (`crypto.subtle`, `crypto.getRandomValues`).
- **Testing:** Vitest + Happy DOM.
- **Deployment:** Netlify (SPA redirects & strict Content Security Policies).

---

## 6. Installation & Local Development

### Prerequisites:
- Node.js 18+
- npm 9+

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Provide your Supabase URL and Anon Key, or rely on the automatic multi-window Local Peer Bus fallback for instant offline testing.

### Step 3: Run Dev Server
```bash
npm run dev
```

### Step 4: Run Automated Tests
```bash
npm test
```

---

## 7. Supabase Database Migration

1. Navigate to your Supabase SQL Editor.
2. Run `supabase/migrations/001_initial_schema.sql`.
3. Verify that Row Level Security (RLS) and Realtime publications are enabled.

---

## 8. Netlify Deployment

- **Build Command:** `npm run build`
- **Publish Directory:** `dist`
- **Configuration:** Handled automatically by `netlify.toml`.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify Site Settings.

---

## 9. Automated Verification Suite (TEST A to TEST K)

The test suite validates all required security properties:

- **TEST A:** Room Code $\ne$ Encryption Key
- **TEST B:** Access Code $\ne$ Encryption Key
- **TEST C:** Visual Cipher Key $\ne$ Encryption Key
- **TEST D:** Changing Room Code does not produce predictable AES key
- **TEST E:** Changing Access Code does not directly produce predictable AES key
- **TEST F:** Every AES-GCM message uses a unique random IV
- **TEST G:** Supabase message rows contain zero plaintext
- **TEST H:** Supabase Realtime payloads contain no plaintext message
- **TEST I:** Unauthorized users cannot read/unwrap room messages
- **TEST J:** Visual cipher remains reversible (`2266` $\to 16 \to \text{P}$, `amma` $\leftrightarrow$ `pbbp`)
- **TEST K:** `9999` $\to 36 \to 9 \to \text{I}$, `amma` $\leftrightarrow$ `iuui` $\leftrightarrow$ `amma`
