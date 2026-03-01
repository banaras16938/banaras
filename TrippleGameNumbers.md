# Tripple Game Numbers

**But in the matka Game for Single Patti** (or Single Pana))

This is the exact mathematical logic behind the **Single Patti** (or Single Pana) format in Satta Matka!

It ties perfectly into your previous question about 3-digit numbers with no repeating digits, but adds a few specific rules for how the game operates. Here is exactly why those specific 120 numbers are used:

### **1. All Digits Must Be Unique (The "Single" in Single Patti)**

Just like the numbers we discussed earlier, a Single Patti cannot have any repeating digits. If a number has two repeating digits (like 112 or 225), it becomes a **Double Patti**. If all three repeat (like 111), it is a **Triple Patti**.

### **2. Ascending Order Only**

In Matka, the numbers in a patti are always sorted from lowest to highest. There is one catch: **0 is treated as the highest number (like a 10)**, so it always goes at the very end.

Because the digits are locked into an ascending order, variations of the same three digits don't count. For example, you can have **128**, but 218, 812, or 821 do not exist in the game.

Mathematically, if you are choosing 3 unique digits out of 10 possible digits (1, 2, 3, 4, 5, 6, 7, 8, 9, 0) and the order doesn't matter because it's forced into ascending sequence, you use a combinations formula:

$\frac{10 \times 9 \times 8}{3 \times 2 \times 1} = 120$

This means there are exactly **120 possible Single Pattis** in existence.

### **3. Grouping by the "Single" Result (The Sum)**

Those 120 unique combinations are divided perfectly into 10 groups (results 1 through 0). The group a Patti belongs to is determined by adding the three digits together and taking the **last digit of the total sum**.

Let's look at the first row for **1** from the list you provided:

- **128:** $1 + 2 + 8 = 11$ (Last digit is **1**)
- **470:** $4 + 7 + 0 = 11$ (Last digit is **1**)
- **579:** $5 + 7 + 9 = 21$ (Last digit is **1**)

If you do this for all 120 combinations, they distribute perfectly evenly. Every single-digit outcome from 1 to 0 gets exactly **12 Pattis**.

If you are setting up the backend logic for a system like this, it makes generating the numbers straightforward: pick 3 unique digits, sort them ascending (treating 0 as > 9), sum them, and group them by the last digit of that sum!

**Single Patti Numbers-**

**Group 1 (the single of all these no will be 1)**

- 128, 137, 146, 236, 245
- 290, 380, 470, 489
- 560, 678, 579

### **Group 2 (the single of all these no will be 2)**

- 129, 138, 147, 156, 237
- 246, 345, 390, 480
- 570, 679, 589

### **Group 3 (the single of all these no will be 3)**

- 120, 139, 148, 157, 238
- 247, 256, 346, 490
- 580, 670, 689

### **Group 4 (the single of all these no will be 4)**

- 130, 149, 158, 167, 239
- 248, 257, 347, 356
- 590, 680, 789

### **Group 5(the single of all these no will be 5)**

- 140, 159, 168, 230, 249
- 258, 267, 348, 357
- 456, 690, 780

### **Group 6(the single of all these no will be 6)**

- 123, 150, 169, 178, 240
- 259, 268, 349, 358
- 457, 367, 790

### **Group 7(the single of all these no will be 7)**

- 124, 160, 179, 250, 269
- 278, 340, 359, 368
- 458, 467, 890

### **Group 8(the single of all these no will be 8)**

- 125, 134, 170, 189, 260
- 279, 350, 369, 378
- 459, 567, 468

### **Group 9(the single of all these no will be 9)**

- 126, 135, 180, 234, 270
- 289, 360, 379, 450
- 469, 478, 568

### **Group 0 (the single of all these no will be 0)**

- 127, 136, 145, 190, 235
- 280, 370, 479, 460
- 569, 389, 578

# **Double Patti Game Numbers Group 1**

- **100, 119, 155, 227, 335**
- **344, 399, 588, 660**

### **Group 2**

- **200, 110, 228, 255, 336**
- **499, 660, 688, 778**

### **Group 3**

- **300, 166, 229, 337, 355**
- **445, 599, 779, 788**

### **Group 4**

- **400, 112, 220, 266, 338**
- **446, 455, 699, 770**

### **Group 5**

- **500, 113, 122, 177, 328**
- **355, 447, 799, 889**

### **Group 6**

- **600, 114, 277, 330, 448**
- **466, 556, 880, 899**

### **Group 7**

- **700, 115, 133, 188, 223**
- **377, 449, 557, 566**

### **Group 8**

- **800, 116, 224, 233, 288**
- **440, 477, 558, 990**

### **Group 9**

- **900, 117, 144, 199, 225**
- **388, 559, 577, 667**

### **Group 0**

- **550, 668, 244, 299, 226**
- **488, 677, 118, 334**

# **Teen(triple) Patti Game Numbers**

As the name implies, every number in this category consists of three identical digits. Just like the Single and Double Pattis, the last digit of their sum determines their group. Because there are only 10 possible digits (0-9), there is exactly one Triple Patti combination per group!

### **Group 1**

- 777

### **Group 2**

- 444

### **Group 3**

- 111

### **Group 4**

- 888 (Note: The number is partially obscured by the blue banner in the image, but the math $8 + 8 + 8 = 24$ confirms it goes here)

### **Group 5**

- 555

### **Group 6**

- 222

### **Group 7**

- 999

### **Group 8**

- 666

### **Group 9**

- 333

### **Group 0**

- 000