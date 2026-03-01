# New SRS

# MATKA GAME — SYSTEM REQUIREMENTS SPECIFICATION (SRS v3.0)

---

# 1. System Overview

## 1.1 Purpose

The system is a **controlled Matka management platform** designed to:

- Centralize betting operations through staff
- Prevent direct public betting
- Provide mathematically controlled result declaration
- Ensure long-term net positive profitability
- Maintain auditability and fraud resistance

---

## 1.2 System Architecture

The platform consists of three dashboards:

1. **Admin Dashboard** — full authority
2. **Staff Dashboard** — bet entry layer
3. **User Dashboard** — public result viewer

---

## 1.3 Core Principles

- Users cannot place bets directly
- Staff acts as operator
- Admin controls outcomes
- All numbers must be mathematically valid
- Profit engine must evaluate every result
- Betting windows strictly enforced

---

# 2. Technology Stack

## Frontend

- Next.js
- Tailwind CSS
- Motion.dev (animations)

## Backend

- Supabase (PostgreSQL + Auth + RLS)

## Timezone

- System timezone: **Asia/Kolkata**

---

# 3. User Roles

## 3.1 Admin

Full system authority.

### Permissions

- Create/remove staff
- Declare results
- View liability
- Configure payouts
- Configure schedules
- View analytics
- Control profit engine

---

## 3.2 Staff

Operational role.

### Permissions

- Create players
- Place bets
- View own reports
- View results (read-only)

### Restrictions

- Cannot edit bets after insert
- Cannot declare results
- Cannot modify payouts

---

## 3.3 Public Users

No login required.

### Access

- View current results
- View history

### Restrictions

- No betting
- No wallet
- No transactions

---

# 4. Game Types (FINAL)

---

## 4.1 Single

- Range: **0–9**
- Payout: **10 → 90**
- Multiplier: **9x**

---

## 4.2 Jodi

- Range: **00–99**
- Payout: **10 → 900**
- Multiplier: **90x**

---

# 🚨 4.3 Patti Games (Major Change)

Triple game is now split into three categories.

---

## 4.3.1 Single Patti

### Definition

3-digit number where:

- all digits unique
- digits in ascending order
- 0 treated as highest
- no repetition

### Total Count

```
10C3 = 120
```

### Payout

```
₹10 → ₹1400
Multiplier = 140x
```

---

## 4.3.2 Double Patti

### Definition

- exactly two digits same
- one digit different

### Total Count

```
90 numbers (matka standard)
```

### Payout

```
₹10 → ₹2800
Multiplier = 280x
```

---

## 4.3.3 Triple Patti

### Definition

All three digits identical.

### Count

```
10 numbers
```

### Payout

```
₹10 → ₹8000
Multiplier = 800x
```

---

# 5. Patti Master Universe (CRITICAL)

System must ONLY allow bets from valid universe.

## Total Valid Pattis

| Type | Count |
| --- | --- |
| Single Patti | 120 |
| Double Patti | 90 |
| Triple Patti | 10 |
| **TOTAL** | **220** |

---

## 🚨 Hard Rule

Staff must select pattis from **predefined master table only**.

Free text entry is strictly forbidden.

---

# 6. Result Calculation Logic

Each session produces:

- Open Patti
- Open Single
- Close Patti
- Close Single
- Final Jodi

---

## 6.1 Open Patti

Admin/system selects one valid patti from the 220 universe.

---

## 6.2 Open Single

Formula:

```
sum of digits → take rightmost digit
```

Example:

```
578 → 5+7+8=20 → Open Single = 0
```

---

## 6.3 Close Patti

Same logic as open.

---

## 6.4 Close Single

Same formula.

---

## 6.5 Jodi Formation

```
Jodi = open_single || close_single
```

Example:

```
Open = 5
Close = 8
Jodi = 58
```

---

# 7. Game Timeline (Locked)

---

Game timeline can be changed from the admin dashboard , as all this timign is stored in the game_schedules table

## 7.1 System Start

```
09:00 AM IST
```

---

# Morning Game

| Phase | Time |
| --- | --- |
| Betting Start | 09:00 |
| Open/Jodi Lock | 12:30 |
| Open Result | 13:00 |
| Close Lock | 14:30 |
| Final Result | 15:00 |

---

# Night Game

| Phase | Time |
| --- | --- |
| Betting Start | 09:00 |
| Open/Jodi Lock | 17:30 |
| Open Result | 18:00 |
| Close Lock | 19:30 |
| Final Result | 20:00 |

---

# 8. Betting Rules

---

## 8.1 Immutable Bets

Once inserted:

```
❌ cannot edit
❌ cannot delete
```

Only status update allowed.

---

## 8.2 Time Validation

Bet allowed only if:

```
current_time within allowed window
AND
not a holiday
AND
staff active
```

---

## 8.3 Number Validation

System must validate:

- single → 0–9
- jodi → 00–99
- patti → exists in patti_master

---

# 9. Profit Control Engine (CORE)

---

## 9.1 Calculation Window

Admin gets 30-minute freeze window.

During freeze:

- bets locked
- liability computed
- best result suggested

---

## 9.2 Candidate Scan Universe

System must scan only:

```
220 valid pattis
```

NOT 000–999.

---

## 9.3 Liability Formula

For each candidate:

### Immediate Risk

- patti winners
- single winners

### Future Risk

- jodi exposure band

---

## 9.4 Result Selector Panels

Admin dashboard shows:

1. Exact Target Match
2. Leverage Range (±10%)
3. Low Bet Numbers
4. Ghost Numbers (0 liability)

---

# 10. Winner Processing Logic

---

## 10.1 Morning Open Processing

System must:

- Morning Open triple(one from either single patti , double pattio or tripple patti numbers)
morning open single

---

## 10.2 Morning Close Processing

System must:

- Morning close triple(one from either single patti , double pattio or tripple patti numbers)
morning close single 
and based on all caluclation morning jodi(which is the combination of the morning open single and morning  close single)

---

# 11. Database Requirements

---

## 11.1 bet_category (FINAL)

```
single
jodi
single_patti
double_patti
triple_patti
```

---

## 11.2 game_config (FINAL)

Must include:

- payout_single
- payout_jodi
- payout_single_patti
- payout_double_patti
- payout_triple_patti

---

## 11.3 patti_master (MANDATORY)

Fields:

- patti_number
- patti_type
- single_digit

Purpose:

- validation
- fast lookup
- fraud prevention
- profit simulation

---

# 12. Security Requirements

---

## 12.1 RLS Enforcement

- staff sees own bets
- admin sees all
- public read-only results

---

## 12.2 Anti-Fraud Rules

System must:

- block bets after freeze
- block inactive staff
- block holiday betting
- validate patti via master
- prevent duplicate edits

---

## 12.3 Critical Financial Safeguards

Never allow:

- manual result without liability check
- free-text patti entry
- payout without status change
- race conditions during freeze

---

# 13. Performance Requirements

Expected improvements after new model:

- search space: **1000 → 220**
- faster simulations
- lower DB load
- better caching

Target:

- liability scan < 200 ms
- result declare < 1 sec

---

# 14. Audit & Reporting

System must maintain:

- full bet history
- staff performance view
- liability snapshots
- payout logs

All financial changes must be traceable.

---

# ✅ FINAL STATUS

This SRS defines a **production-grade Matka control system** with:

- mathematically valid patti universe
- official payout structure
- controlled betting windows
- admin profit engine
- Supabase RLS security
- scalable architecture