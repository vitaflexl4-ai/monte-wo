# Phase 2 calculator methods and limits

These calculators run only in the browser. They are educational estimates, not tests of strength, clinical measurements, or prescribed diets. The input bounds below are implementation guardrails—not declarations that every value in the range is healthy, suitable, or validated.

## 1. Estimated one-rep maximum

The requested Epley calculation is `load × (1 + repetitions / 30)`. For one repetition, this implementation uses the entered load without inflating it. It accepts integer reps from 1 to 30; the UI highlights higher-rep uncertainty above 10. Reference percentages are simple fractions of the estimate and are not training prescriptions. Users should not attempt an unsafe max to confirm a calculator result.

## 2. Plates

`per-side weight = (total target − bar weight − combined collar weight) / 2`.

Available counts are **pairs**: one plate per side for each available pair. Supported denominations:

- kg: 25, 20, 15, 10, 5, 2.5, 1.25, 0.5.
- lb: 45, 35, 25, 10, 5, 2.5, 1.25.

Each pair count is an integer from 0 to 8. Target limits are 600 kg / 1,500 lb; these are computational bounds, not equipment ratings. Bar and collar weights are included. Targets below the bar-plus-collars are rejected. The solver optimizes the nearest at-or-below load, then fewest plates, in quarter-unit increments per side. It never mixes kg/lb or adds unavailable plates. When no plates fit, it can show only the bar/collars and explicitly reports the shortfall.

The visual shows at most eight plates per side; when more are needed, the full numeric recipe remains authoritative and the limit is disclosed. Sleeve length, plate diameter, bar capacity, and equipment condition are not modeled.

## 3. Protein

`daily protein grams = bodyweight kg × selected factor`.

The selectable 1.4–2.0 g/kg/day reference range comes from the ISSN position stand for exercising individuals. It is not a personalized prescription for every adult. [2](https://link.springer.com/article/10.1186/s12970-017-0177-8)

The default 1.6 factor is a product planning choice. Per-portion grams are the total divided evenly by the selected number of portions; no nutrient-timing benefit or supplement requirement is claimed. Bodyweight input is 30–300 kg (or the converted lb equivalent). The tool is not intended for clinical protein restrictions or other medical nutrition planning.

## 4. Resting energy and TDEE

The simplified Mifflin–St Jeor resting energy equations are:

- Male reference: `10 × kg + 6.25 × cm − 5 × age + 5`.
- Female reference: `10 × kg + 6.25 × cm − 5 × age − 161`.

The equation is for **resting energy expenditure (REE)**, not directly measured TDEE. [1](https://mifflinstjeor.com/mifflin-st-jeor-equation/)

Primary paper reviewed: Mifflin et al., *A new predictive equation for resting energy expenditure in healthy individuals*, American Journal of Clinical Nutrition (1990), [PubMed PMID 2305711](https://pubmed.ncbi.nlm.nih.gov/2305711/). Its abstract explicitly gives the simplified coefficients above.

The tool's TDEE is `REE × activity multiplier`. Activity multipliers 1.20, 1.375, 1.55, 1.725, and 1.90 are broad planning assumptions; they are not part of the original REE equation and are not measured activity. Supported age is 18–100; height 120–230 cm; weight 30–300 kg. These software bounds are not a guarantee of validity across all people or life stages. The reference selection chooses the equation coefficient, not a statement about gender identity.

## 5. Macros

Protein grams use the selected factor from the protein tool. Fat grams are the selected 20–35% energy share divided by 9 kcal/g. Carbohydrates receive the remaining calories divided by 4 kcal/g. Protein also uses 4 kcal/g. The default fat share is 25%, an adjustable planning assumption—not a claim of an optimal ratio.

The tool takes an existing daily-energy estimate from the user; it does not set a calorie deficit. Allowed calorie input is 1,200–8,000, a numeric guardrail rather than a safe-intake recommendation. If protein and fat use all the calories, no macro result is shown. Percentages use unrounded values; displayed gram rounding may produce small reconstruction differences.

## 6. Circumference-based body fat

The implemented Navy-style equations use **inches**, including when the form accepts cm: measurements are converted before evaluating the logarithms. [2](https://calcilo.com/us/body-fat-calculator/)

- Male reference: `86.010 × log10(abdomen − neck) − 70.041 × log10(height) + 36.76`.
- Female reference: `163.205 × log10(waist + hips − neck) − 97.684 × log10(height) − 78.387`.

Measure male abdomen at the navel, female waist at the narrowest point, and hips at the widest. Keep the neck/head neutral and use consistent tape placement without compressing the skin. Equations and measurement inputs are described in the method guide. [3](https://rippedbody.com/how-calculate-body-fat-percentage/)

This is an approximation, not clinical body-composition testing. We do **not** promise a numerical accuracy margin, assign a fitness/health category, prescribe a target percentage, or recommend weight loss from the result. Invalid logarithm inputs and results outside the display interval (strictly above 0% and below 70%) show an explanatory error rather than being clamped. The formula may not fit a person's body even when it returns a plausible number.

## Unit conversion and display

- 1 lb = 0.45359237 kg.
- 1 inch = 2.54 cm.
- Unit toggles retain up to four decimal places in converted inputs; numerical boundary tolerance prevents tiny round-trip conversion noise from rejecting valid boundary values.
- Initial results are labeled **Example inputs**. Editing a form clears its previous output until Calculate is selected, preventing stale estimates from appearing current.
- Reset restores defaults, not a user profile. Values are not persisted by these six tools.
