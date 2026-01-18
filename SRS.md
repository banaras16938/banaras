# GAME – SYSTEM & LOGIC DOCUMENTATION

## 1. System Overview

The system consists of **three dashboards**:

1. **Admin Dashboard** – Full control & result logic authority
2. **Staff Dashboard** – Bet entry & user interaction layer
3. **User Dashboard** – Result viewing only (no login required)

This architecture ensures:

- No direct betting by users
- Reduced fraud risk
- Centralized profit control
- Simple user experience

---

## 2. Dashboard-wise Functional Breakdown

---

## 2.1 User Dashboard (Public – No Login)

### Purpose

To allow users to **view results and historical data** only.

### Features

- View **current game result**
- View **previous results (history)**
- Display format:
    
    ![Screenshot 2025-12-28 at 10.25.54 PM.png](GAME%20%E2%80%93%20SYSTEM%20&%20LOGIC%20DOCUMENTATION/Screenshot_2025-12-28_at_10.25.54_PM.png)
    
    - Open Triple
    - Open Single
    - Close Triple
    - Close Single

### Limitations

- ❌ No login
- ❌ No bet placement
- ❌ No wallet or transaction access

---

## 2.2 Staff Dashboard (Operational Layer)

### Purpose

Staff acts as a **bet entry operator** on behalf of users.

### Authentication

- Staff is created **only by Admin and can be removed any time by the admin**
- Staff receives:
    - User ID
    - One-time password (must reset on first login)
- Staff will have record of profit loss dashboard

### Core Responsibilities

- Add bets for users
- Manage user-wise bet entries once added the bet can’t change it.
- View assigned bets
- View declared results (read-only)

### Bet Entry Options

Staff can place bets for users in:

| Game Type | Range | Payout system |
| --- | --- | --- |
| Single | 0–9 | 10 ka 90 |
| Double (Jodi) | 00–99 | 10 ka 900 |
| Triple (Patti) | 000–999 | 10 ka 8000 |
|  |  |  |

---

## 2.3 Admin Dashboard (Control & Profit Engine)

### Purpose

Admin controls:

- Staff creation
- Result generation
- Profit optimization
- Risk minimization

Admin is the **only authority** who can:

- Declare results
- Configure result logic
- Access profit/loss analytics

---

## 3. Game Types & Payout Logic

### 3.1 Single

- User selects one digit: **0–9**
- If digit matches single result:
    - ₹10 → ₹90 payout
- Effective multiplier: **9x**

---

### 3.2 Double (Jodi)

- User selects **00–99**
- If matches final jodi:
    - ₹10 → ₹900 payout
- Effective multiplier: **90x**

---

### 3.3 Triple (Patti)

- User selects **000–999**
- If matches open or close triple:
    - ₹10 → ₹8000 payout
- Effective multiplier: 8**00x**

---

## 4. Result Calculation Logic (Core Engine)

Each game consists of:

- **Open Result**
- **Close Result**

### Step-by-step Logic

### Step 1: Open Triple

Any 3-digit number from **000–999**

Example:

```
OpenTriple=578

```

### Step 2: Open Single

Sum digits:

```
5 + 7 + 8 = 20

```

Take **rightmost digit**:

```
OpenSingle=0

```

---

### Step 3: Close Triple

Example:

```
CloseTriple=478

```

### Step 4: Close Single

```
4 +7 +8 =19
Rightmostdigit=9

```

---

### Step 5: Final Double (Jodi)

```
Open Single+Close Single=09

```

---

### Final Display

| Open tripe | Jodi | Close triple |
| --- | --- | --- |
| 578 | 09 | 478 |

---

## 5. Admin Result Logic & Profit Control System

> Critical Section – Read Carefully
> 

Admin result logic is designed to **ensure net positive profit in every scenario**.

---

Admin can choose the result  ways

### The Dashboard: "Result Selector"

**Active Time:** Only during Stop Windows (e.g., 12:30–1:00 PM).

### 1. The Input (Admin Control)

- **Profit/Payout Slider:** A slider bar ranging from **0% to 30%**.
    - *Label:* "Desired User Payout %"
    - *Action:* Admin drags slider to e.g., **15%**.
    - *Meaning:* "Show me results where the system pays out approx. 15% of total collection and keeps 85% profit."

### 2. The Logic Engine (Backend Calculation)

When the Admin selects a percentage (e.g., 10%), the system scans all **1,000 Triples (000–999)** and calculates the **Total Liability** for each.

**Formula for "Total Liability" of a Triple (e.g., 578):**
Since `5 + 7 + 8 = 20` (Single is **0**), picking `578` triggers payouts for:

1. **Triple Winner:** Anyone who bet on `578`.
2. **Single Winner:** Anyone who bet on Single `0`.
3. **Jodi Risk:** Since this is the Open result, the system estimates the max potential payout for Jodis `00-09` (using the Night/Close logic).

Total Liability=(Triple Bets×800)+(Single Bets×90)+(Projected Jodi Payout)

---

### 📊 The 4 Data Lists (Output)

Based on the calculation above, the screen displays 4 specific tables requested by you:

### List A: "Target Match" (The Slider Result)

- **Logic:** Filters Triples where the `(Total Liability / Total Collection)` is roughly equal to the Admin's selected % (e.g., 10% ± 2%).
- **Use Case:** The Admin wants to make the game look "fair" by letting some people win, but controls the exact loss.
- **Display:**
    - Triple: `145` | Single: `0` | Payout: `10.5%` | Profit: `89.5%`
    - Triple: `668` | Single: `0` | Payout: `9.8%` | Profit: `90.2%`

### List B: "System Recommendations" (Highest Profit)

- **Logic:** The algorithm ignores the slider and simply sorts all 1,000 outcomes by **Maximum Admin Profit**.
- **Display:** Top 5 Triples that result in the absolute lowest payout mathematically possible.

### List C: "Numbers with Less Bets" (Low Payout)

- **Logic:** Shows Triples where total bet volume is non-zero but very low (bottom 20th percentile).
- **Use Case:** Winners exist, but they are small players. Good for maintaining "hope" in the user base without losing big money.
- **Display:**
    - Triple: `224` | Total Bets: `₹500` | Payout: `₹4500`

### List D: "Numbers with NO Bets" (100% Profit)

- **Logic:** Filters Triples where `Total Bet Amount == 0` AND `Associated Single Bet Amount == 0`.
- **Result:** If Admin picks this, **System pays ₹0**. Admin keeps 100% of collection.
- **Display:** List of "Ghost Numbers" (e.g., `119`, `337`, `400`).

---

## Game Timeline

This is the **Final, Locked Logic** for  developer. This schedule maximizes betting volume (starting at 9:00 AM) while mathematically guaranteeing the Admin remains net positive by using the **30-minute Calculation Windows** to manipulate the result.

### 🕒 The Master Schedule (Daily Cycle)

**System Start Time:** 09:00 AM (Universal Start for both games).

### 1. Morning Game (Results: 1 PM & 3 PM)

- **Betting Window:** 09:00 AM start.
- **Critical Constraint:** You get **3.5 hours** of betting volume before the first lock.

| **Bet Type** | **Betting Starts** | **STOP WINDOW (Hard Lock)** | **Result Reveal** | **Status** |
| --- | --- | --- | --- | --- |
| **Open & Jodi** | 09:00 AM | **12:30 PM – 01:00 PM** | **01:00 PM** | ❌ Betting Permanently Closed |
| **Close** | 09:00 AM | **02:30 PM – 03:00 PM** | **03:00 PM** | ❌ Betting Permanently Closed |

### 2. Night Game (Results: 6 PM & 8 PM)

- **Betting Window:** 09:00 AM start.
- **Critical Constraint:** This creates a massive **8.5 hour** betting window for the Night Open, maximizing revenue.

| **Bet Type** | **Betting Starts** | **STOP WINDOW (Hard Lock)** | **Result Reveal** | **Status** |
| --- | --- | --- | --- | --- |
| **Open & Jodi** | 09:00 AM | **05:30 PM – 06:00 PM** | **06:00 PM** | ❌ Betting Permanently Closed |
| **Close** | 09:00 AM | **07:30 PM – 08:00 PM** | **08:00 PM** | ❌ Betting Permanently Closed |

**The "Net Positive" Logic Engine**
*How the system uses the 30-minute gaps to guarantee profit.*
**Phase 1: Morning Open Calculation (12:30 PM - 01:00 PM)**
• **System Action:** FREEZE all Morning bets.
• **The Logic:**
    1. Sum total bets on every number (Single 0-9, Triple 000-999, Jodi 00-99).
    2. The algorithm simulates picking "0" as the Open result. It calculates:
        ▪ Immediate Payout (Open Single winners + Open Triple winners).
        ▪ **Future Risk:** It checks all locked Jodi bets starting with "0" (00-09).
    3. It repeats this for 1-9.
    4. **Selection:** It picks the Open number that keeps the "Immediate Payout + Max Possible Future Jodi Payout" **LOWER** than total collection.
• **Result:** Open Number Declared (e.g., "5").
**Phase 2: Morning Close Calculation (02:30 PM - 03:00 PM)**
• **System Action:** FREEZE all Morning Close bets.
• **The Logic:**
    1. The Open number is already "5".
    2. The System looks at:
        ▪ Bets on Close Single (0-9).
        ▪ Bets on Jodi (specifically 50, 51, 52... 59).
    3. Selection: It picks a Close number (e.g., "8") such that:
$$(\text{Close Payout} + \text{Jodi '58' Payout}) < \text{Total Morning Collection}$$
• **Result:** Close Number Declared ("8"). **Jodi is "58".**
*(The exact same logic repeats for the Night Game at 05:30 PM and 07:30 PM)*
**🛠️ Developer Implementation Guide (Rules)**
To make this work, your developer must implement these specific conditional checks in the backend code:
1. The "Jodi" Safety Check
Even though the Night Game is open from 9:00 AM, if a user tries to place a Jodi bet for the Night Game at 05:31 PM, the API must return an error.
• *Code Rule:* `IF game_type == 'Night' AND bet_type == 'Jodi' AND time > 17:30 THEN REJECT`
2. The Calculation Freeze
During the 30-minute stop windows, the specific game is in "Admin Mode".
• **12:30-1:00:** Users can bet on Night Game, but **CANNOT** bet on Morning Close yet. (Best practice to avoid data conflicts).
• **Best Practice:** Re-open "Morning Close" betting only **AFTER** the 1:00 PM result is live.
3. Data Structure for Result
Your database Results table needs these columns to handle the split timing:
• `game_date` (Date)
• `slot` (Enum: Morning/Night)
• `open_declare_number` (Int)
• `close_declare_number` (Int)
• `jodi_final` (Int)
• `is_open_declared` (Boolean) - *Switches to True at 1:00 PM / 6:00 PM*
• `is_close_declared` (Boolean) - *Switches to True at 3:00 PM / 8:00 PM*
**📊 Visual Timeline**
**Summary for your Team:**
• **09:00 AM:** Betting ON (All).
• **12:30 PM:** Morning Open/Jodi **LOCK**.
• **01:00 PM:** Morning Open Result.
• **02:30 PM:** Morning Close **LOCK**.
• **03:00 PM:** Morning Final Result.
• **05:30 PM:** Night Open/Jodi **LOCK**.
• **06:00 PM:** Night Open Result.
• **07:30 PM:** Night Close **LOCK**.
• **08:00 PM:** Night Final Result.