import { Platform } from "react-native";

export type WorldFoodItem = {
  id: string;
  name: string;
  brand?: string;
  region:
    | "Haitian & Caribbean"
    | "Global Staple"
    | "Gym & Packaged"
    | "OpenFoodFacts"
    | "USDA Global"
    | "Custom";
  category: "protein" | "carb" | "fat" | "produce" | "mixed" | "dairy";
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  fiber100?: number;
  servingLabel: string;
  servingGrams: number;
  barcode?: string;
  imageUrl?: string;
  tags: string[]; // vegan, vegetarian, pescatarian, pork-free, dairy-free, gluten-free, haitian, mediterranean, latin, gym
};

export type ScannedPlateItem = {
  food: WorldFoodItem;
  grams: number;
  note?: string;
};

export type MealPlanPreferences = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  mealsPerDay: 3 | 4 | 5;
  cuisine: "all" | "haitian" | "gym" | "mediterranean" | "latin";
  diet: "omnivore" | "halal_no_pork" | "pescatarian" | "vegetarian" | "vegan";
  dairyFree: boolean;
  glutenFree: boolean;
  excludeText: string;
};

export type PlannedMealIngredient = {
  food: WorldFoodItem;
  grams: number;
  household: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type PlannedMeal = {
  slotIndex: number;
  slotName: string;
  title: string;
  cuisineBadge: string;
  prepNote: string;
  templateId: string;
  ingredients: PlannedMealIngredient[];
  totals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
};

export type GeneratedMealPlan = {
  preferences: MealPlanPreferences;
  meals: PlannedMeal[];
  dayTotals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  groceryList: { name: string; totalGrams: number; category: string }[];
};

const CUSTOM_FOODS_KEY = "montewo.custom_foods.v1";
const VISION_KEY_STORAGE = "montewo.vision_api_config.v1";

// [id, name, regionCode, category, kcal100, p100, c100, f100, servingLabel, servingGrams, tagsCsv, barcode?]
const RAW_FOOD_SEED: [
  string,
  string,
  "H" | "G" | "P",
  WorldFoodItem["category"],
  number,
  number,
  number,
  number,
  string,
  number,
  string,
  string?,
][] = [
  // HAITIAN & CARIBBEAN STAPLES
  ["diri-ak-pwa", "Diri ak Pwa Wouj (Haitian Rice & Red Beans)", "H", "carb", 152, 4.8, 28.5, 2.1, "1 cup cooked", 195, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,haitian,latin"],
  ["diri-djondjon", "Diri ak Djondjon (Black Mushroom Rice)", "H", "carb", 158, 4.2, 29.0, 2.8, "1 cup cooked", 190, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,haitian"],
  ["sos-pwa-nwa", "Sos Pwa Nwa (Haitian Black Bean Purée)", "H", "carb", 118, 7.2, 19.5, 1.4, "1 cup", 220, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,haitian,latin"],
  ["griot-pork", "Griot (Citrus-Braised Crispy Pork Shoulder)", "H", "protein", 268, 25.4, 1.8, 17.6, "150g portion", 150, "dairy-free,gluten-free,haitian"],
  ["tassot-cabrit", "Tassot Cabrit (Seasoned Crispy Goat)", "H", "protein", 215, 27.8, 1.2, 10.6, "150g portion", 150, "pork-free,dairy-free,gluten-free,haitian"],
  ["tassot-boeuf", "Tassot Boeuf (Spiced Sear-Fried Beef)", "H", "protein", 238, 28.2, 1.5, 13.0, "150g portion", 150, "pork-free,dairy-free,gluten-free,haitian"],
  ["poulet-en-sauce", "Poulet en Sauce (Haitian Creole Chicken)", "H", "protein", 178, 24.5, 3.8, 7.2, "180g serving", 180, "pork-free,dairy-free,gluten-free,haitian"],
  ["pwason-snapper", "Pwason Kwit (Whole Red Snapper Creole)", "H", "protein", 136, 24.2, 2.0, 3.4, "180g fillet", 180, "pescatarian,pork-free,dairy-free,gluten-free,haitian,mediterranean"],
  ["lambi-conch", "Lambi en Sauce (Creole Braised Conch)", "H", "protein", 142, 24.8, 3.5, 2.6, "160g serving", 160, "pescatarian,pork-free,dairy-free,gluten-free,haitian"],
  ["bannann-peze", "Bannann Peze (Twice-Fried Green Plantains)", "H", "carb", 225, 1.6, 37.5, 8.2, "4 pressed pieces", 120, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,haitian,latin"],
  ["bouyi-bannann", "Bannann Bouyi (Boiled Green Plantain)", "H", "carb", 116, 1.0, 29.8, 0.2, "1 medium plantain", 180, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,haitian,latin"],
  ["maduros-plantain", "Sweet Ripe Plantain (Roasted / Light Sear)", "H", "carb", 155, 1.2, 34.0, 2.5, "1 cup sliced", 150, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,haitian,latin"],
  ["soup-joumou", "Soup Joumou (Traditional Squash & Beef Soup)", "H", "mixed", 92, 6.4, 11.2, 2.5, "1 large bowl", 350, "pork-free,dairy-free,haitian"],
  ["legim-haitian", "Légume Haïtien (Stewed Eggplant, Cabbage & Beef)", "H", "mixed", 108, 8.5, 7.8, 4.8, "1 cup", 220, "pork-free,dairy-free,gluten-free,haitian"],
  ["lalo-stew", "Lalo (Jute Leaves & Spinach Stew)", "H", "produce", 78, 5.2, 6.8, 3.4, "1 cup", 200, "pork-free,dairy-free,gluten-free,haitian"],
  ["mayi-moulen", "Mayi Moulen (Savory Haitian Cornmeal)", "H", "carb", 112, 2.6, 22.8, 1.3, "1 cup cooked", 210, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,haitian"],
  ["kasav-bread", "Kasav (Traditional Cassava Flatbread)", "H", "carb", 330, 1.5, 79.0, 0.6, "1 wedge", 60, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,haitian"],
  ["lam-veritab", "Lam Veritab (Boiled/Roasted Breadfruit)", "H", "carb", 103, 1.1, 27.1, 0.2, "1 cup", 180, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,haitian"],
  ["yanm-boiled", "Yanm Bouyi (Boiled Caribbean Yam)", "H", "carb", 118, 1.5, 27.9, 0.2, "1 cup cubed", 170, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,haitian"],
  ["pikliz", "Pikliz (Spicy Pickled Cabbage & Scotch Bonnet)", "H", "produce", 28, 1.1, 5.4, 0.2, "2 tbsp", 35, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,haitian"],
  ["mango-francique", "Mango Francique (Fresh Ripe Mango)", "H", "produce", 60, 0.8, 15.0, 0.4, "1 whole mango", 220, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,haitian,latin"],

  // GLOBAL PROTEINS
  ["chicken-breast", "Grilled Chicken Breast (Skinless)", "G", "protein", 165, 31.0, 0.0, 3.6, "1 medium breast", 170, "pork-free,dairy-free,gluten-free,gym,mediterranean,latin"],
  ["chicken-thigh", "Boneless Skinless Chicken Thigh (Cooked)", "G", "protein", 209, 26.0, 0.0, 10.9, "2 thighs", 160, "pork-free,dairy-free,gluten-free,gym,latin"],
  ["turkey-breast", "Lean Ground Turkey 93/7 (Cooked)", "G", "protein", 172, 27.2, 0.0, 6.8, "150g cooked", 150, "pork-free,dairy-free,gluten-free,gym"],
  ["lean-ground-beef", "Lean Ground Beef 93% Lean / 7% Fat (Cooked)", "G", "protein", 192, 28.4, 0.0, 8.2, "150g cooked", 150, "pork-free,dairy-free,gluten-free,gym,latin"],
  ["ground-beef-85", "Ground Beef 85/15 (Cooked)", "G", "protein", 250, 25.9, 0.0, 15.4, "150g cooked", 150, "pork-free,dairy-free,gluten-free,gym"],
  ["sirloin-steak", "Top Sirloin Steak (Grilled, Trimmed)", "G", "protein", 206, 29.8, 0.0, 9.0, "200g steak", 200, "pork-free,dairy-free,gluten-free,gym,latin"],
  ["ribeye-steak", "Ribeye Steak (Grilled)", "G", "protein", 291, 24.0, 0.0, 21.8, "225g steak", 225, "pork-free,dairy-free,gluten-free,gym"],
  ["atlantic-salmon", "Baked Atlantic Salmon Fillet", "G", "protein", 208, 22.5, 0.0, 12.4, "170g fillet", 170, "pescatarian,pork-free,dairy-free,gluten-free,gym,mediterranean"],
  ["white-cod-tilapia", "Baked Cod / Tilapia Fillet", "G", "protein", 105, 22.8, 0.0, 1.3, "180g fillet", 180, "pescatarian,pork-free,dairy-free,gluten-free,gym,mediterranean"],
  ["canned-tuna", "Solid Albacore / Chunk Light Tuna in Water", "G", "protein", 116, 25.5, 0.0, 0.9, "1 drained can", 140, "pescatarian,pork-free,dairy-free,gluten-free,gym,mediterranean", "0080000006745"],
  ["shrimp-cooked", "Grilled / Peeled Shrimp", "G", "protein", 99, 24.0, 0.2, 0.3, "160g portion", 160, "pescatarian,pork-free,dairy-free,gluten-free,gym,mediterranean"],
  ["whole-eggs", "Large Whole Eggs", "G", "protein", 143, 12.6, 0.7, 9.5, "2 large eggs", 100, "vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym,mediterranean,latin"],
  ["liquid-egg-whites", "Pasteurized Liquid Egg Whites", "G", "protein", 52, 10.9, 0.7, 0.2, "1 cup (240g)", 240, "vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym"],
  ["greek-yogurt-0", "Plain Nonfat Greek Yogurt (0%)", "G", "dairy", 59, 10.3, 3.6, 0.4, "1 cup (225g)", 225, "vegetarian,pescatarian,pork-free,gluten-free,gym,mediterranean", "0689544080602"],
  ["greek-yogurt-2", "Plain 2% Greek Yogurt", "G", "dairy", 73, 9.9, 3.8, 1.9, "1 cup (225g)", 225, "vegetarian,pescatarian,pork-free,gluten-free,gym,mediterranean"],
  ["cottage-cheese", "Low-Fat 2% Cottage Cheese", "G", "dairy", 81, 11.0, 4.3, 2.3, "1 cup (220g)", 220, "vegetarian,pescatarian,pork-free,gluten-free,gym"],
  ["extra-firm-tofu", "Extra-Firm Tofu (Pressed & Seared)", "G", "protein", 144, 15.7, 2.8, 8.7, "180g block", 180, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym"],
  ["tempeh-organic", "Organic Soy Tempeh", "G", "protein", 192, 20.3, 7.6, 10.8, "140g portion", 140, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym"],
  ["cooked-lentils", "Cooked Green / Brown Lentils", "G", "protein", 116, 9.0, 20.1, 0.4, "1 cup cooked", 198, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,mediterranean"],
  ["edamame-shelled", "Steamed Shelled Edamame", "G", "protein", 121, 11.9, 8.9, 5.2, "1 cup", 155, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym"],

  // GYM & PACKAGED STAPLES (WITH REAL BARCODES)
  ["whey-isolate", "100% Whey Protein Isolate Powder", "P", "protein", 370, 83.3, 3.3, 1.7, "1 scoop (30g)", 30, "vegetarian,pescatarian,pork-free,gluten-free,gym", "0748927028652"],
  ["plant-protein", "Pea & Brown Rice Vegan Protein Powder", "P", "protein", 375, 75.0, 8.0, 5.0, "1 scoop (32g)", 32, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym"],
  ["protein-bar-quest", "High-Protein Low-Sugar Bar", "P", "mixed", 333, 33.3, 35.0, 11.7, "1 bar (60g)", 60, "vegetarian,pescatarian,pork-free,gluten-free,gym", "0888849000012"],
  ["ultra-filtered-milk", "Ultra-Filtered High-Protein 2% Milk", "P", "dairy", 50, 5.4, 2.5, 1.9, "1 cup (240ml)", 240, "vegetarian,pescatarian,pork-free,gluten-free,gym", "0811620020025"],
  ["nutella-spread", "Hazelnut Cocoa Spread (Nutella)", "P", "fat", 539, 6.3, 57.5, 30.9, "2 tbsp (37g)", 37, "vegetarian,pescatarian,pork-free,gluten-free", "3017620422003"],
  ["barilla-spaghetti", "Durum Wheat Semolina Pasta (Dry)", "P", "carb", 359, 12.5, 71.2, 2.0, "85g dry serving", 85, "vegan,vegetarian,pescatarian,pork-free,dairy-free,mediterranean", "8076809513753"],
  ["quaker-rolled-oats", "Old Fashioned Rolled Oats (Dry)", "P", "carb", 375, 12.5, 67.5, 6.3, "1/2 cup dry (40g)", 40, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym", "0030000010402"],

  // GLOBAL CARBS & GRAINS
  ["jasmine-rice", "Cooked White / Jasmine / Basmati Rice", "G", "carb", 130, 2.7, 28.2, 0.3, "1 cup cooked", 180, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym,haitian,latin"],
  ["brown-rice", "Cooked Whole-Grain Brown Rice", "G", "carb", 123, 2.7, 25.6, 1.0, "1 cup cooked", 195, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym"],
  ["quinoa-cooked", "Cooked Tri-Color Quinoa", "G", "carb", 120, 4.4, 21.3, 1.9, "1 cup cooked", 185, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,mediterranean"],
  ["cream-of-rice", "Cream of Rice Hot Cereal (Dry)", "G", "carb", 370, 6.7, 82.0, 0.5, "45g dry packet", 45, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym"],
  ["sweet-potato", "Baked Orange Sweet Potato", "G", "carb", 90, 2.0, 20.7, 0.2, "1 medium (180g)", 180, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym,haitian"],
  ["russet-potato", "Baked / Roasted White Potato", "G", "carb", 93, 2.5, 21.2, 0.1, "1 medium (200g)", 200, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym"],
  ["cooked-pasta", "Cooked Pasta (Penne / Spaghetti)", "G", "carb", 158, 5.8, 30.9, 0.9, "1.5 cups cooked", 210, "vegan,vegetarian,pescatarian,pork-free,dairy-free,mediterranean"],
  ["sourdough-bread", "Artisan Sourdough / Whole-Wheat Bread", "G", "carb", 265, 9.4, 51.0, 2.4, "2 slices", 80, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gym,mediterranean"],
  ["plain-bagel", "Plain Bakery Bagel", "G", "carb", 275, 10.5, 54.0, 1.6, "1 bagel", 105, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gym"],
  ["flour-tortilla", "Large Burrito Tortilla / Wrap", "G", "carb", 304, 8.2, 51.0, 7.4, "1 wrap", 70, "vegan,vegetarian,pescatarian,pork-free,dairy-free,latin"],
  ["corn-tortilla", "Nixtamal Corn Tortillas", "G", "carb", 218, 5.7, 44.6, 2.9, "3 tortillas", 75, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,latin"],
  ["black-beans", "Seasoned Black Beans / Pinto Beans", "G", "carb", 132, 8.9, 23.7, 0.5, "1 cup cooked", 172, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,latin,haitian"],
  ["chickpeas-cooked", "Roasted / Cooked Chickpeas (Garbanzo)", "G", "carb", 164, 8.9, 27.4, 2.6, "1 cup", 164, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,mediterranean"],

  // HEALTHY FATS
  ["avocado-zaboka", "Fresh Avocado / Zaboka", "G", "fat", 160, 2.0, 8.5, 14.7, "1/2 avocado", 100, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,haitian,latin,mediterranean,gym"],
  ["extra-virgin-olive-oil", "Extra-Virgin Olive Oil", "G", "fat", 884, 0.0, 0.0, 100.0, "1 tbsp (14g)", 14, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,mediterranean,gym"],
  ["natural-peanut-butter", "Natural Peanut Butter", "G", "fat", 588, 25.1, 20.0, 50.4, "2 tbsp (32g)", 32, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym"],
  ["almond-butter", "Roasted Almond Butter", "G", "fat", 614, 21.0, 18.8, 55.5, "2 tbsp (32g)", 32, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym"],
  ["raw-almonds", "Whole Roasted Almonds / Mixed Nuts", "G", "fat", 579, 21.2, 21.6, 49.9, "1 oz handful (28g)", 28, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,mediterranean,gym"],
  ["walnuts-halves", "Raw Walnut Halves", "G", "fat", 654, 15.2, 13.7, 65.2, "1 oz (28g)", 28, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,mediterranean"],
  ["chia-flax-seeds", "Chia / Ground Flax Seeds", "G", "fat", 486, 16.5, 42.1, 30.7, "2 tbsp (24g)", 24, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym"],
  ["feta-cheese", "Crumbled Mediterranean Feta / Mozzarella", "G", "dairy", 264, 14.2, 4.1, 21.3, "40g crumble", 40, "vegetarian,pescatarian,pork-free,gluten-free,mediterranean"],
  ["hummus-dip", "Classic Chickpea Tahini Hummus", "G", "fat", 177, 7.9, 14.3, 9.6, "4 tbsp (60g)", 60, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,mediterranean"],

  // FRUITS & VEGETABLES
  ["banana-fresh", "Fresh Medium Banana", "G", "produce", 89, 1.1, 22.8, 0.3, "1 medium", 118, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym,haitian,latin"],
  ["mixed-berries", "Blueberries / Strawberries / Raspberries", "G", "produce", 52, 0.8, 12.6, 0.3, "1 cup", 150, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym,mediterranean"],
  ["apple-crisp", "Honeycrisp / Gala Apple", "G", "produce", 52, 0.3, 13.8, 0.2, "1 medium apple", 182, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym"],
  ["pineapple-chunks", "Fresh Pineapple / Anana", "G", "produce", 50, 0.5, 13.1, 0.1, "1 cup chunks", 165, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,haitian,latin"],
  ["broccoli-roasted", "Steamed / Roasted Broccoli Florets", "G", "produce", 35, 2.4, 7.2, 0.4, "1.5 cups", 150, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym"],
  ["spinach-greens", "Sautéed Spinach & Mixed Greens", "G", "produce", 23, 2.9, 3.6, 0.4, "2 cups", 120, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym,mediterranean"],
  ["asparagus-zucchini", "Grilled Asparagus & Zucchini", "G", "produce", 22, 2.3, 3.9, 0.2, "1.5 cups", 150, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,mediterranean,gym"],
  ["mediterranean-salad", "Cucumber, Tomato, Bell Pepper & Red Onion", "G", "produce", 24, 1.0, 5.2, 0.2, "1.5 cups chopped", 160, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,mediterranean,latin"],

  // RESTAURANT & EVERYDAY MEALS
  ["chipotle-chicken-bowl", "Grilled Chicken Rice & Bean Burrito Bowl", "P", "mixed", 156, 11.8, 17.5, 4.4, "1 full bowl (450g)", 450, "pork-free,gluten-free,latin,gym"],
  ["salmon-avocado-roll", "Salmon Avocado Sushi Roll (8 pcs)", "P", "mixed", 162, 7.6, 22.0, 4.8, "1 roll (210g)", 210, "pescatarian,pork-free,dairy-free"],
  ["rotisserie-chicken-plate", "Quarter Rotisserie Chicken (Meat Only)", "P", "protein", 190, 27.5, 0.5, 8.6, "170g meat", 170, "pork-free,dairy-free,gluten-free,gym"],
  ["double-cheeseburger", "Double Beef Cheeseburger", "P", "mixed", 268, 15.8, 21.0, 13.6, "1 burger (215g)", 215, "pork-free,fastfood"],
  ["french-fries", "Crispy Potato Fries", "P", "carb", 312, 3.4, 41.4, 14.7, "1 medium order (117g)", 117, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,fastfood"],

  // MORE HAITIAN & CARIBBEAN FAVORITES
  ["pate-kode", "Haitian Pate Kode (Crispy Savory Meat Patty)", "H", "mixed", 285, 11.2, 27.5, 14.4, "1 patty (120g)", 120, "pork-free,haitian"],
  ["spaghetti-haitien", "Spaghetti Haïtien (Hotdog / Herring Tomato Pasta)", "H", "mixed", 174, 7.8, 23.2, 5.6, "1 plate (260g)", 260, "haitian"],
  ["bouyon-bef", "Haitian Bouyon Bèf (Beef, Spinach, Plantain & Yam Stew)", "H", "mixed", 118, 9.4, 13.5, 3.1, "1 large bowl (380g)", 380, "pork-free,dairy-free,gluten-free,haitian"],
  ["poisson-gros-sel", "Haitian Poisson Gros Sel (Whole Red Snapper)", "H", "protein", 136, 22.8, 1.8, 4.2, "1 fillet (220g)", 220, "pescatarian,pork-free,dairy-free,gluten-free,haitian"],
  ["akra-malanga", "Haitian Akra (Crispy Malanga Fritters)", "H", "carb", 238, 3.2, 29.5, 11.8, "4 pieces (100g)", 100, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,haitian"],
  ["pain-patate", "Haitian Pain Patate (Sweet Potato Coconut Pudding)", "H", "carb", 242, 3.4, 41.0, 7.6, "1 slice (115g)", 115, "vegetarian,pescatarian,pork-free,haitian"],
  ["jamaican-jerk-chicken", "Jamaican Jerk Chicken (Charcoal Grilled)", "H", "protein", 188, 26.4, 3.2, 7.6, "200g serving", 200, "pork-free,dairy-free,gluten-free,haitian"],
  ["oxtail-stew", "Caribbean Braised Oxtail & Butter Beans", "H", "protein", 242, 23.5, 6.2, 13.8, "240g serving", 240, "pork-free,dairy-free,gluten-free,haitian"],
  ["mofongo-puerto-rico", "Puerto Rican Mofongo (Mashed Garlic Plantains)", "H", "carb", 224, 3.6, 34.5, 8.4, "1 dome (200g)", 200, "pork-free,dairy-free,gluten-free,haitian,latin"],
  ["roti-curry-chicken", "Trinidadian Curry Chicken Roti", "H", "mixed", 205, 13.2, 24.0, 6.2, "1 wrapped roti (300g)", 300, "pork-free,dairy-free,haitian"],

  // AFRICAN CUISINE (WEST, EAST, NORTH)
  ["nigerian-jollof-rice", "West African Party Jollof Rice", "G", "carb", 158, 3.6, 28.4, 3.4, "1.5 cups (250g)", 250, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,african"],
  ["suya-beef-skewers", "Nigerian Spicy Suya Grilled Beef Skewers", "G", "protein", 218, 28.5, 3.8, 9.8, "2 skewers (180g)", 180, "pork-free,dairy-free,gluten-free,african,gym"],
  ["egusi-pounded-yam", "Egusi Melon Seed Soup with Chicken & Greens", "G", "mixed", 184, 14.2, 7.5, 11.2, "1 bowl (260g)", 260, "pork-free,dairy-free,gluten-free,african"],
  ["waakye-ghana", "Ghanaian Waakye (Rice & Sorghum Black-Eyed Peas)", "G", "carb", 142, 5.8, 26.4, 1.4, "1.5 cups (240g)", 240, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,african"],
  ["ethiopian-doro-wat", "Ethiopian Doro Wat Spicy Chicken & Egg Stew", "G", "protein", 168, 17.6, 5.4, 8.6, "1 bowl (240g)", 240, "pork-free,gluten-free,african"],
  ["injera-flatbread", "Ethiopian Teff Injera Flatbread", "G", "carb", 145, 4.8, 29.2, 1.1, "1 large injera (150g)", 150, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,african"],
  ["thieboudienne-senegal", "Senegalese Thieboudienne (Fish, Tomato Rice & Veg)", "G", "mixed", 152, 11.4, 18.8, 3.6, "1 plate (320g)", 320, "pescatarian,pork-free,dairy-free,gluten-free,african"],
  ["moroccan-chicken-tagine", "Moroccan Olive & Lemon Chicken Tagine", "G", "protein", 148, 18.5, 4.2, 6.4, "250g serving", 250, "pork-free,dairy-free,gluten-free,african,mediterranean"],
  ["ugali-cornmeal", "East African Ugali / Fufu / Sadza", "G", "carb", 118, 2.6, 25.4, 0.7, "1 serving (220g)", 220, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,african"],

  // EAST & SOUTHEAST ASIAN CUISINE
  ["chicken-teriyaki-bowl", "Japanese Chicken Teriyaki & Steamed Rice Bowl", "G", "mixed", 156, 12.8, 21.0, 2.4, "1 bowl (380g)", 380, "pork-free,dairy-free,asian,gym"],
  ["tonkotsu-ramen", "Japanese Ramen Noodle Bowl with Egg & Pork/Chicken", "G", "mixed", 122, 6.8, 13.5, 4.6, "1 large bowl (520g)", 520, "dairy-free,asian"],
  ["salmon-nigiri", "Fresh Salmon Nigiri Sushi", "G", "protein", 146, 9.2, 19.8, 3.2, "6 pieces (180g)", 180, "pescatarian,pork-free,dairy-free,gluten-free,asian,gym"],
  ["spicy-tuna-roll", "Spicy Tuna Maki Roll", "G", "mixed", 168, 9.4, 21.5, 4.8, "8 pieces (190g)", 190, "pescatarian,pork-free,dairy-free,asian"],
  ["korean-bibimbap", "Korean Beef Bibimbap Rice, Veggies & Fried Egg", "G", "mixed", 148, 9.2, 19.6, 3.8, "1 stone bowl (420g)", 420, "pork-free,dairy-free,asian,gym"],
  ["korean-bulgogi", "Korean Grilled Bulgogi Marinated Beef", "G", "protein", 212, 23.4, 8.2, 9.4, "180g serving", 180, "pork-free,dairy-free,asian,gym"],
  ["chinese-beef-broccoli", "Stir-Fried Beef & Broccoli in Savory Garlic Sauce", "G", "protein", 138, 14.8, 6.4, 6.1, "1.5 cups (260g)", 260, "pork-free,dairy-free,asian,gym"],
  ["kung-pao-chicken", "Kung Pao Chicken with Roasted Peanuts", "G", "protein", 174, 16.5, 8.8, 8.2, "240g serving", 240, "pork-free,dairy-free,asian"],
  ["egg-fried-rice", "Wok Egg Fried Rice with Scallions & Peas", "G", "carb", 172, 5.4, 27.6, 4.4, "1.5 cups (230g)", 230, "vegetarian,pescatarian,pork-free,dairy-free,asian"],
  ["pho-bo-vietnam", "Vietnamese Pho Bo Beef Noodle Soup", "G", "mixed", 86, 7.4, 10.2, 1.8, "1 bowl (550g)", 550, "pork-free,dairy-free,gluten-free,asian,gym"],
  ["banh-mi-chicken", "Vietnamese Grilled Chicken Banh Mi Baguette", "G", "mixed", 218, 13.4, 26.8, 6.4, "1 sandwich (260g)", 260, "pork-free,dairy-free,asian"],
  ["pad-thai-shrimp", "Thai Shrimp or Chicken Pad Thai Rice Noodles", "G", "mixed", 182, 10.2, 23.8, 5.4, "1 plate (320g)", 320, "pescatarian,pork-free,dairy-free,gluten-free,asian"],
  ["thai-green-curry", "Thai Coconut Green Curry with Chicken", "G", "protein", 146, 12.6, 5.2, 8.4, "1 bowl (260g)", 260, "pork-free,dairy-free,gluten-free,asian"],
  ["hainanese-chicken-rice", "Hainanese Poached Chicken & Ginger Rice", "G", "mixed", 168, 14.2, 19.4, 3.8, "1 plate (360g)", 360, "pork-free,dairy-free,asian,gym"],
  ["chicken-adobo", "Filipino Braised Chicken Adobo", "G", "protein", 196, 22.8, 3.1, 10.2, "200g serving", 200, "pork-free,dairy-free,asian"],

  // SOUTH ASIAN / INDIAN & MIDDLE EASTERN CUISINE
  ["chicken-tikka-masala", "Chicken Tikka Masala", "G", "protein", 164, 15.8, 6.8, 8.2, "1 cup (245g)", 245, "pork-free,gluten-free,indian"],
  ["butter-chicken", "Indian Butter Chicken (Murgh Makhani)", "G", "protein", 178, 15.2, 6.4, 10.2, "1 cup (245g)", 245, "pork-free,gluten-free,indian"],
  ["tandoori-chicken", "Clay-Oven Tandoori Chicken", "G", "protein", 154, 25.4, 2.4, 4.6, "200g serving", 200, "pork-free,gluten-free,indian,gym"],
  ["chicken-biryani", "Hyderabadi Spiced Chicken Biryani", "G", "mixed", 172, 11.4, 21.8, 4.4, "1.5 cups (300g)", 300, "pork-free,indian"],
  ["chana-masala", "Chana Masala Spiced Chickpea Curry", "G", "carb", 136, 6.8, 20.4, 3.4, "1 cup (240g)", 240, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,indian"],
  ["dal-tadka", "Yellow Lentil Dal Tadka", "G", "carb", 118, 6.6, 17.4, 2.6, "1 cup (240g)", 240, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,indian"],
  ["garlic-naan", "Tandoor Baked Garlic Naan Bread", "G", "carb", 292, 8.6, 48.5, 6.8, "1 naan (90g)", 90, "vegetarian,pescatarian,pork-free,indian"],
  ["chicken-shawarma-plate", "Levantine Grilled Chicken Shawarma, Rice & Garlic Toum", "G", "mixed", 176, 15.2, 16.4, 5.6, "1 plate (360g)", 360, "pork-free,mediterranean,gym"],
  ["beef-kofta-kebab", "Chargrilled Beef & Lamb Kofta Skewers", "G", "protein", 236, 22.8, 2.4, 14.8, "2 skewers (170g)", 170, "pork-free,dairy-free,gluten-free,mediterranean"],
  ["falafel-hummus-bowl", "Crispy Chickpea Falafel, Hummus & Tabbouleh", "G", "mixed", 214, 8.6, 24.2, 9.4, "1 bowl (280g)", 280, "vegan,vegetarian,pescatarian,pork-free,dairy-free,mediterranean"],
  ["hummus-dip", "Classic Tahini Chickpea Hummus", "G", "fat", 166, 7.9, 14.3, 9.6, "4 tbsp (60g)", 60, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,mediterranean"],

  // LATIN AMERICAN & EUROPEAN FAVORITES
  ["carne-asada-tacos", "Mexican Carne Asada Corn Tortilla Tacos", "G", "mixed", 198, 14.8, 19.2, 6.8, "3 street tacos (225g)", 225, "pork-free,dairy-free,gluten-free,latin,gym"],
  ["brazilian-picanha", "Churrasco Grilled Sirloin Cap (Picanha)", "G", "protein", 248, 26.2, 0, 15.4, "200g steak", 200, "pork-free,dairy-free,gluten-free,latin,gym"],
  ["feijoada-stew", "Brazilian Black Bean & Beef Stew", "G", "mixed", 154, 12.6, 14.8, 4.8, "1 bowl (280g)", 280, "dairy-free,gluten-free,latin"],
  ["peruvian-ceviche", "Peruvian Fresh White Fish Citrus Ceviche", "G", "protein", 96, 17.8, 4.2, 1.1, "1 bowl (220g)", 220, "pescatarian,pork-free,dairy-free,gluten-free,latin,gym"],
  ["arepa-chicken-avocado", "Venezuelan Reina Pepiada Chicken & Avocado Arepa", "G", "mixed", 194, 12.4, 21.8, 6.4, "1 stuffed arepa (210g)", 210, "pork-free,dairy-free,gluten-free,latin"],
  ["acai-fruit-bowl", "Brazilian Açaí Berry, Banana & Granola Bowl", "G", "carb", 138, 2.8, 26.4, 2.9, "1 bowl (280g)", 280, "vegan,vegetarian,pescatarian,pork-free,dairy-free,latin"],
  ["margherita-pizza", "Wood-Fired Margherita Pizza", "P", "mixed", 252, 11.2, 31.8, 8.8, "2 slices (214g)", 214, "vegetarian,pescatarian,pork-free,mediterranean,fastfood"],
  ["pepperoni-pizza", "Pepperoni Pizza", "P", "mixed", 278, 12.2, 30.6, 11.8, "2 slices (214g)", 214, "fastfood"],
  ["spaghetti-bolognese", "Italian Pasta with Lean Beef Ragù Bolognese", "G", "mixed", 148, 9.8, 19.4, 3.4, "1 plate (340g)", 340, "pork-free,mediterranean,gym"],
  ["spanish-seafood-paella", "Spanish Saffron Chicken & Seafood Paella", "G", "mixed", 158, 11.6, 20.4, 3.4, "1 plate (320g)", 320, "pescatarian,pork-free,dairy-free,gluten-free,mediterranean"],
  ["greek-chicken-souvlaki", "Greek Grilled Chicken Souvlaki, Pita & Tzatziki", "G", "mixed", 168, 16.4, 15.8, 4.4, "1 platter (320g)", 320, "pork-free,mediterranean,gym"],
  ["butter-croissant", "French Flaky Butter Croissant", "P", "carb", 406, 8.2, 45.8, 21.0, "1 croissant (67g)", 67, "vegetarian,pescatarian,pork-free"],

  // MORE WHOLE FOODS, FRUITS, DAIRY & PACKAGED BARCODE ITEMS
  ["cottage-cheese-lowfat", "2% Low-Fat Cottage Cheese", "P", "dairy", 81, 11.1, 4.3, 2.3, "1 cup (226g)", 226, "vegetarian,pescatarian,pork-free,gluten-free,gym", "0041383090527"],
  ["whole-milk", "Whole Cow's Milk", "G", "dairy", 61, 3.2, 4.8, 3.3, "1 cup (244ml)", 244, "vegetarian,pescatarian,pork-free,gluten-free"],
  ["unsweetened-almond-milk", "Unsweetened Almond Milk", "P", "dairy", 15, 0.6, 0.6, 1.2, "1 cup (240ml)", 240, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,gym"],
  ["nutella-spread", "Hazelnut Cocoa Spread", "P", "fat", 539, 6.3, 57.5, 30.9, "2 tbsp (37g)", 37, "vegetarian,pescatarian,pork-free,gluten-free", "3017620422003"],
  ["barilla-spaghetti-dry", "Durum Wheat Semolina Pasta (Cooked Equiv.)", "P", "carb", 158, 5.8, 30.9, 0.9, "1 cup cooked (140g)", 140, "vegan,vegetarian,pescatarian,pork-free,dairy-free,mediterranean,gym", "8076809513753"],
  ["chicken-thigh-boneless", "Grilled Boneless Skinless Chicken Thigh", "G", "protein", 177, 24.8, 0, 8.0, "180g cooked", 180, "pork-free,dairy-free,gluten-free,gym"],
  ["pork-tenderloin", "Roasted Lean Pork Tenderloin", "G", "protein", 143, 26.2, 0, 3.5, "180g cooked", 180, "dairy-free,gluten-free,gym"],
  ["watermelon-fresh", "Fresh Watermelon / Melon Dlo", "G", "produce", 30, 0.6, 7.6, 0.2, "2 cups diced (300g)", 300, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,haitian"],
  ["dates-medjool", "Medjool Dates (Pre-Workout Carb)", "G", "carb", 277, 1.8, 75.0, 0.2, "2 dates (48g)", 48, "vegan,vegetarian,pescatarian,pork-free,dairy-free,gluten-free,mediterranean,gym"],
  ["honey-raw", "Raw Wildflower Honey / Siwo Myèl", "G", "carb", 304, 0.3, 82.4, 0, "1 tbsp (21g)", 21, "vegetarian,pescatarian,pork-free,dairy-free,gluten-free,haitian,gym"],
];

export const BUILTIN_WORLD_FOODS: WorldFoodItem[] = RAW_FOOD_SEED.map(
  ([id, name, reg, cat, kcal, p, c, f, sLabel, sGrams, tagsCsv, barcode]) => ({
    id,
    name,
    region:
      reg === "H"
        ? "Haitian & Caribbean"
        : reg === "P"
          ? "Gym & Packaged"
          : "Global Staple",
    category: cat,
    kcal100: kcal,
    protein100: p,
    carbs100: c,
    fat100: f,
    servingLabel: sLabel,
    servingGrams: sGrams,
    barcode,
    tags: tagsCsv.split(",").map((t) => t.trim()),
  }),
);

export function loadCustomWorldFoods(): WorldFoodItem[] {
  if (Platform.OS !== "web" || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_FOODS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomWorldFood(input: {
  name: string;
  brand?: string;
  servingLabel?: string;
  servingGrams: number;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  barcode?: string;
}): WorldFoodItem {
  const name = String(input.name || "").trim();
  if (name.length < 2) throw new Error("Enter a food name.");
  const grams = Math.max(1, Number(input.servingGrams) || 100);
  const factor = 100 / grams;
  const item: WorldFoodItem = {
    id: "custom-food-" + Date.now().toString(36),
    name,
    brand: input.brand?.trim() || undefined,
    region: "Custom",
    category: "mixed",
    kcal100: Math.round((Number(input.caloriesPerServing) || 0) * factor * 10) / 10,
    protein100: Math.round((Number(input.proteinPerServing) || 0) * factor * 10) / 10,
    carbs100: Math.round((Number(input.carbsPerServing) || 0) * factor * 10) / 10,
    fat100: Math.round((Number(input.fatPerServing) || 0) * factor * 10) / 10,
    servingLabel: input.servingLabel?.trim() || `${grams}g`,
    servingGrams: grams,
    barcode: input.barcode?.trim() || undefined,
    tags: ["custom"],
  };
  const next = [item, ...loadCustomWorldFoods()];
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.localStorage.setItem(CUSTOM_FOODS_KEY, JSON.stringify(next));
  }
  return item;
}

export function macrosForGrams(food: WorldFoodItem, grams: number) {
  const g = Math.max(0, Number(grams) || 0);
  const ratio = g / 100;
  return {
    grams: Math.round(g),
    calories: Math.round(food.kcal100 * ratio),
    proteinG: Math.round(food.protein100 * ratio * 10) / 10,
    carbsG: Math.round(food.carbs100 * ratio * 10) / 10,
    fatG: Math.round(food.fat100 * ratio * 10) / 10,
  };
}

export function searchLocalFoods(
  query: string,
  regionFilter: string = "all",
): WorldFoodItem[] {
  const all = [...loadCustomWorldFoods(), ...BUILTIN_WORLD_FOODS];
  const q = String(query || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

  const filtered = all.filter((f) => {
    if (regionFilter === "haitian" && f.region !== "Haitian & Caribbean" && !f.tags.includes("haitian"))
      return false;
    if (regionFilter === "african" && !f.tags.includes("african")) return false;
    if (regionFilter === "asian" && !f.tags.includes("asian")) return false;
    if (regionFilter === "indian" && !f.tags.includes("indian")) return false;
    if (regionFilter === "latin" && !f.tags.includes("latin")) return false;
    if (regionFilter === "mediterranean" && !f.tags.includes("mediterranean")) return false;
    if (regionFilter === "gym" && !f.tags.includes("gym") && f.region !== "Gym & Packaged")
      return false;
    if (!tokens.length) return true;
    const hay = `${f.name} ${f.brand || ""} ${f.region} ${f.tags.join(" ")} ${f.barcode || ""}`
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "");
    return tokens.every((t) => hay.includes(t));
  });

  if (!q) return filtered;
  return filtered.sort((a, b) => {
    const an = a.name.toLowerCase();
    const bn = b.name.toLowerCase();
    const aStarts = an.startsWith(q) ? 1 : 0;
    const bStarts = bn.startsWith(q) ? 1 : 0;
    return bStarts - aStarts;
  });
}

// ============================================================================
// MULTI-ENGINE LIVE WORLD FOOD SEARCH (OPEN FOOD FACTS v3/v2 + USDA GLOBAL)
// ============================================================================
function parseOffProduct(p: any): WorldFoodItem | null {
  if (!p) return null;
  const name = String(
    p.product_name_en || p.product_name || p.generic_name || "",
  ).trim();
  if (!name) return null;
  const n = p.nutriments || {};
  const p100 = Number(n.proteins_100g ?? n.proteins ?? 0) || 0;
  const c100 = Number(n.carbohydrates_100g ?? n.carbohydrates ?? 0) || 0;
  const f100 = Number(n.fat_100g ?? n.fat ?? 0) || 0;
  let kcal100 = Number(n["energy-kcal_100g"] ?? n["energy-kcal"] ?? 0);
  if (!Number.isFinite(kcal100) || kcal100 <= 0) {
    const kj = Number(n.energy_100g ?? 0);
    kcal100 = kj > 0 ? Math.round(kj / 4.184) : Math.round(p100 * 4 + c100 * 4 + f100 * 9);
  }
  if (kcal100 <= 0 && p100 <= 0 && c100 <= 0 && f100 <= 0) return null;

  const servG = Math.max(
    10,
    Math.min(1000, Math.round(Number(p.serving_quantity) || 100)),
  );
  const code = String(p.code || p._id || Math.random().toString(36).slice(2));

  return {
    id: "off-" + code,
    name,
    brand: p.brands ? String(p.brands).split(",")[0].trim() : undefined,
    region: "OpenFoodFacts",
    category: "mixed",
    kcal100: Math.round(kcal100 * 10) / 10,
    protein100: Math.round(p100 * 10) / 10,
    carbs100: Math.round(c100 * 10) / 10,
    fat100: Math.round(f100 * 10) / 10,
    servingLabel: p.serving_size ? String(p.serving_size) : `${servG}g`,
    servingGrams: servG,
    barcode: String(p.code || ""),
    imageUrl: p.image_front_small_url || p.image_url || undefined,
    tags: ["openfoodfacts"],
  };
}

function parseUsdaFood(item: any): WorldFoodItem | null {
  if (!item || !item.description) return null;
  const nutrients: any[] = Array.isArray(item.foodNutrients) ? item.foodNutrients : [];
  const findNut = (names: string[]) => {
    for (const n of nutrients) {
      const nm = String(n.nutrientName || n.name || "").toLowerCase();
      if (names.some((k) => nm.includes(k))) {
        return Number(n.value ?? n.amount ?? 0) || 0;
      }
    }
    return 0;
  };
  const p100 = findNut(["protein"]);
  const c100 = findNut(["carbohydrate"]);
  const f100 = findNut(["total lipid", "fat"]);
  let kcal100 = findNut(["energy"]);
  if (kcal100 > 950) kcal100 = Math.round(kcal100 / 4.184); // kJ -> kcal guard
  if (kcal100 <= 0) kcal100 = Math.round(p100 * 4 + c100 * 4 + f100 * 9);
  if (kcal100 <= 0 && p100 <= 0 && c100 <= 0 && f100 <= 0) return null;

  const servG = Math.max(
    10,
    Math.min(1000, Math.round(Number(item.servingSize) || 100)),
  );
  const rawDesc = String(item.description).trim();
  const formattedName =
    rawDesc === rawDesc.toUpperCase()
      ? rawDesc
          .toLowerCase()
          .replace(/\b\w/g, (ch) => ch.toUpperCase())
      : rawDesc;

  return {
    id: "usda-" + String(item.fdcId || Math.random().toString(36).slice(2)),
    name: formattedName,
    brand: item.brandOwner || item.brandName || "USDA Global",
    region: "USDA Global",
    category: "mixed",
    kcal100: Math.round(kcal100 * 10) / 10,
    protein100: Math.round(p100 * 10) / 10,
    carbs100: Math.round(c100 * 10) / 10,
    fat100: Math.round(f100 * 10) / 10,
    servingLabel:
      item.householdServingFullText ||
      (item.servingSize && item.servingSizeUnit
        ? `${Math.round(item.servingSize)} ${item.servingSizeUnit}`
        : `${servG}g`),
    servingGrams: servG,
    barcode: item.gtinUpc ? String(item.gtinUpc) : undefined,
    tags: ["usda"],
  };
}

export async function searchWorldFoodsOnline(
  query: string,
  signal?: AbortSignal,
): Promise<WorldFoodItem[]> {
  const q = String(query || "").trim();
  if (q.length < 2) return [];

  // 1. Open Food Facts v3 Elasticsearch (3M+ global products, <300ms, CORS *)
  const offV3Promise = fetch(
    `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=24&fields=code,product_name,product_name_en,brands,nutriments,serving_size,serving_quantity,image_front_small_url`,
    { signal },
  )
    .then(async (r) => (r.ok ? (await r.json())?.hits || [] : []))
    .catch(() => []);

  // 2. USDA FoodData Central Global & Whole-Food Registry (400k+ items, CORS *)
  const usdaPromise = fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=${encodeURIComponent(q)}&pageSize=18`,
    { signal },
  )
    .then(async (r) => (r.ok ? (await r.json())?.foods || [] : []))
    .catch(() => []);

  const [offHits, usdaFoods] = await Promise.all([offV3Promise, usdaPromise]);

  const parsed: WorldFoodItem[] = [];
  const seen = new Set<string>();

  for (const raw of usdaFoods) {
    const item = parseUsdaFood(raw);
    const key = item ? `${item.name.toLowerCase()}|${(item.brand || "").toLowerCase()}` : "";
    if (item && !seen.has(key)) {
      seen.add(key);
      parsed.push(item);
    }
  }

  for (const raw of offHits) {
    const item = parseOffProduct(raw);
    const key = item ? `${item.name.toLowerCase()}|${(item.brand || "").toLowerCase()}` : "";
    if (item && !seen.has(key)) {
      seen.add(key);
      parsed.push(item);
    }
  }

  // Fallback to OpenFoodFacts v2 if both primary endpoints yielded empty
  if (parsed.length === 0 && !signal?.aborted) {
    try {
      const v2 = await fetch(
        `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(q)}&page_size=18&fields=code,product_name,product_name_en,brands,nutriments,serving_size,serving_quantity,image_front_small_url`,
        { signal },
      );
      if (v2.ok) {
        const j = await v2.json();
        for (const raw of j?.products || []) {
          const item = parseOffProduct(raw);
          if (item) parsed.push(item);
        }
      }
    } catch {
      // offline
    }
  }

  return parsed;
}

export async function lookupBarcodeEverywhere(
  rawBarcode: string,
): Promise<{ food: WorldFoodItem | null; source: string }> {
  const clean = String(rawBarcode || "").replace(/[^0-9A-Za-z]/g, "").trim();
  if (!clean) return { food: null, source: "empty" };

  // 1. Check custom + curated local foods first
  const localAll = [...loadCustomWorldFoods(), ...BUILTIN_WORLD_FOODS];
  const localHit = localAll.find(
    (f) =>
      f.barcode &&
      (f.barcode === clean ||
        f.barcode.replace(/^0+/, "") === clean.replace(/^0+/, "")),
  );
  if (localHit) return { food: localHit, source: "MONTE Catalog" };

  // 2. Query Open Food Facts 3M+ Global Barcode Registry
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}.json`,
      { signal: AbortSignal.timeout(12000) },
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.status === 1 && data?.product) {
        const parsed = parseOffProduct({ ...data.product, code: clean });
        if (parsed) return { food: parsed, source: "Open Food Facts Global" };
      }
    }
  } catch {
    // offline or blocked
  }

  // 3. Query USDA FoodData Central GTIN/UPC Registry
  try {
    const usdaRes = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=${encodeURIComponent(clean)}&pageSize=5`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (usdaRes.ok) {
      const usdaJson = await usdaRes.json();
      const hit = (usdaJson?.foods || []).find(
        (f: any) =>
          f.gtinUpc &&
          (String(f.gtinUpc) === clean ||
            String(f.gtinUpc).replace(/^0+/, "") === clean.replace(/^0+/, "")),
      );
      if (hit) {
        const parsed = parseUsdaFood(hit);
        if (parsed) return { food: parsed, source: "USDA Global Barcode" };
      }
    }
  } catch {
    // offline or blocked
  }

  return { food: null, source: "not-found" };
}

// ============================================================================
// AI MACRO SCANNER: NATURAL PLATE PARSER + LABEL PARSER + LIVE VISION HOOK
// ============================================================================
export function parseNaturalPlateDescription(description: string): ScannedPlateItem[] {
  const raw = String(description || "").trim();
  if (!raw) return [];

  const allFoods = [...loadCustomWorldFoods(), ...BUILTIN_WORLD_FOODS];
  const segments = raw
    .split(/,|;|\+|\band\b|\bwith\b|\n/i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);

  const results: ScannedPlateItem[] = [];

  for (const seg of segments) {
    const lower = seg
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "");

    // Parse quantity + optional unit (e.g. "200g", "6 oz", "1.5 cups", "3", "half")
    let qty = 1;
    let unit = "";
    const qtyMatch =
      /^(\d+(?:\.\d+)?|\bhalf\b|\ba\b|\ban\b)\s*(g|grams?|oz|ounces?|lb|lbs|cups?|tbsp|tsp|scoops?|slices?|pieces?|fillets?|breasts?|cans?|bowls?)?\b/i.exec(
        lower,
      );
    let foodQuery = lower;
    if (qtyMatch) {
      qty =
        qtyMatch[1] === "half"
          ? 0.5
          : qtyMatch[1] === "a" || qtyMatch[1] === "an"
            ? 1
            : Number(qtyMatch[1]) || 1;
      unit = (qtyMatch[2] || "").toLowerCase();
      foodQuery = lower.slice(qtyMatch[0].length).replace(/^of\s+/i, "").trim();
    }
    if (!foodQuery) foodQuery = lower;

    // Score against food catalog
    const qWords = foodQuery.split(/\s+/).filter((w) => w.length >= 2);
    let best: { food: WorldFoodItem; score: number } | null = null;

    for (const f of allFoods) {
      const nameNorm = f.name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "");
      let score = 0;
      if (nameNorm.includes(foodQuery)) score += 40;
      for (const w of qWords) {
        if (nameNorm.includes(w)) score += 14;
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { food: f, score };
      }
    }

    if (best) {
      let grams = best.food.servingGrams * qty;
      if (unit.startsWith("g")) grams = qty;
      else if (unit.startsWith("oz") || unit.startsWith("ounce"))
        grams = Math.round(qty * 28.35);
      else if (unit.startsWith("lb")) grams = Math.round(qty * 453.6);
      else if (unit.startsWith("tbsp")) grams = Math.round(qty * 15);
      else if (unit.startsWith("tsp")) grams = Math.round(qty * 5);
      else if (unit.startsWith("cup")) {
        grams = Math.round(
          (best.food.servingLabel.includes("cup")
            ? best.food.servingGrams
            : 185) * qty,
        );
      }
      results.push({
        food: best.food,
        grams: Math.max(5, Math.min(2000, Math.round(grams))),
        note: seg,
      });
    }
  }

  return results;
}

export function parseNutritionLabelText(rawText: string): {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
} | null {
  const t = String(rawText || "");
  if (!t.trim()) return null;
  const pick = (rx: RegExp) => {
    const m = rx.exec(t);
    return m ? Number(m[1]) || 0 : 0;
  };
  const calories =
    pick(/calories[:\s]*(\d+(?:\.\d+)?)/i) ||
    pick(/(\d+(?:\.\d+)?)\s*kcal/i);
  const proteinG = pick(/protein[:\s]*(\d+(?:\.\d+)?)\s*g?/i);
  const carbsG =
    pick(/(?:total\s+)?carb(?:ohydrate)?s?[:\s]*(\d+(?:\.\d+)?)\s*g?/i);
  const fatG = pick(/(?:total\s+)?fat[:\s]*(\d+(?:\.\d+)?)\s*g?/i);

  if (calories <= 0 && proteinG <= 0 && carbsG <= 0 && fatG <= 0) return null;
  const computedKcal =
    calories > 0 ? Math.round(calories) : Math.round(proteinG * 4 + carbsG * 4 + fatG * 9);
  return {
    calories: computedKcal,
    proteinG: Math.round(proteinG * 10) / 10,
    carbsG: Math.round(carbsG * 10) / 10,
    fatG: Math.round(fatG * 10) / 10,
  };
}

export type VisionConfig = {
  provider: "openai" | "gemini";
  apiKey: string;
};

export function loadVisionConfig(): VisionConfig {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return { provider: "gemini", apiKey: "" };
  }
  try {
    const raw = window.localStorage.getItem(VISION_KEY_STORAGE);
    if (!raw) return { provider: "gemini", apiKey: "" };
    const parsed = JSON.parse(raw);
    return {
      provider: parsed.provider === "openai" ? "openai" : "gemini",
      apiKey: String(parsed.apiKey || ""),
    };
  } catch {
    return { provider: "gemini", apiKey: "" };
  }
}

export function saveVisionConfig(cfg: VisionConfig) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.localStorage.setItem(VISION_KEY_STORAGE, JSON.stringify(cfg));
  }
}

export async function analyzeFoodImageWithCloudVision(
  dataUrl: string,
  cfg: VisionConfig,
): Promise<{
  mealName: string;
  items: { name: string; grams: number; calories: number; proteinG: number; carbsG: number; fatG: number }[];
}> {
  const key = cfg.apiKey.trim();
  if (!key) throw new Error("Add a Gemini or OpenAI Vision API key, or use Instant Smart Plate Composer below.");

  const prompt =
    'Analyze this meal or nutrition label photo. Return ONLY valid JSON with shape: {"mealName":"string","items":[{"name":"string","grams":150,"calories":250,"proteinG":25,"carbsG":20,"fatG":8}]}';

  if (cfg.provider === "gemini") {
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!match) throw new Error("Invalid image data URL.");
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: match[1], data: match[2] } },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini Vision error (${res.status})`);
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    return JSON.parse(text);
  } else {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI Vision error (${res.status})`);
    const json = await res.json();
    return JSON.parse(json?.choices?.[0]?.message?.content || "{}");
  }
}

// ============================================================================
// PREFERENCE-BASED CUSTOM MEAL PLAN GENERATOR
// ============================================================================
type MealTemplate = {
  id: string;
  slotTypes: ("breakfast" | "main" | "snack")[];
  title: string;
  cuisine: "haitian" | "gym" | "mediterranean" | "latin";
  prepNote: string;
  proteinId: string;
  carbId: string;
  fatId: string;
  produceId?: string;
};

const MEAL_TEMPLATES: MealTemplate[] = [
  // BREAKFASTS
  {
    id: "gym-oats-whey",
    slotTypes: ["breakfast", "snack"],
    title: "Power Oats, Whey Isolate & Berries",
    cuisine: "gym",
    prepNote: "Simmer oats 3 min, stir in whey off-heat, top with berries & almond butter.",
    proteinId: "whey-isolate",
    carbId: "quaker-rolled-oats",
    fatId: "almond-butter",
    produceId: "mixed-berries",
  },
  {
    id: "eggs-sourdough-avocado",
    slotTypes: ["breakfast"],
    title: "Egg-White & Whole-Egg Scramble + Sourdough & Zaboka",
    cuisine: "mediterranean",
    prepNote: "Scramble egg whites + whole eggs in skillet; serve over toasted sourdough with sliced avocado.",
    proteinId: "liquid-egg-whites",
    carbId: "sourdough-bread",
    fatId: "avocado-zaboka",
    produceId: "spinach-greens",
  },
  {
    id: "haitian-morning-eggs-plantain",
    slotTypes: ["breakfast"],
    title: "Haitian Boiled Plantain, Eggs & Zaboka Plate",
    cuisine: "haitian",
    prepNote: "Boil green plantain tender; plate with seasoned eggs, fresh zaboka & pikliz.",
    proteinId: "whole-eggs",
    carbId: "bouyi-bannann",
    fatId: "avocado-zaboka",
    produceId: "pikliz",
  },
  {
    id: "greek-parfait-bowl",
    slotTypes: ["breakfast", "snack"],
    title: "0% Greek Yogurt, Oats, Chia & Mango Bowl",
    cuisine: "mediterranean",
    prepNote: "Layer cold Greek yogurt with oats, fresh mango chunks, and chia seeds.",
    proteinId: "greek-yogurt-0",
    carbId: "quaker-rolled-oats",
    fatId: "chia-flax-seeds",
    produceId: "mango-francique",
  },
  {
    id: "vegan-protein-oats",
    slotTypes: ["breakfast", "snack"],
    title: "Plant-Protein Cinnamon Oats, Banana & Peanut Butter",
    cuisine: "gym",
    prepNote: "Cook oats with water, fold in plant protein, slice banana, drizzle natural PB.",
    proteinId: "plant-protein",
    carbId: "quaker-rolled-oats",
    fatId: "natural-peanut-butter",
    produceId: "banana-fresh",
  },
  {
    id: "vegan-berry-chia-oats",
    slotTypes: ["breakfast", "snack"],
    title: "Plant-Protein Berry Chia Oats & Almond Butter",
    cuisine: "gym",
    prepNote: "Simmer oats, stir in plant protein, top with mixed berries & chia seeds.",
    proteinId: "plant-protein",
    carbId: "quaker-rolled-oats",
    fatId: "chia-flax-seeds",
    produceId: "mixed-berries",
  },
  {
    id: "vegan-edamame-fruit-snack",
    slotTypes: ["snack"],
    title: "Steamed Sea-Salt Edamame, Crisp Apple & Walnuts",
    cuisine: "mediterranean",
    prepNote: "Fast whole-food plant snack with complete amino acids & omega-3s.",
    proteinId: "edamame-shelled",
    carbId: "apple-crisp",
    fatId: "walnuts-halves",
  },
  {
    id: "haitian-vegan-lentil-diri",
    slotTypes: ["main"],
    title: "Haitian Sos Pwa Nwa, Lentils, Jasmine Rice & Zaboka",
    cuisine: "haitian",
    prepNote: "Traditional savory black bean & lentil bowl with fresh avocado and pikliz.",
    proteinId: "cooked-lentils",
    carbId: "diri-ak-pwa",
    fatId: "avocado-zaboka",
    produceId: "pikliz",
  },

  // HAITIAN & CARIBBEAN MAINS
  {
    id: "haitian-poulet-diri-pwa",
    slotTypes: ["main"],
    title: "Poulet en Sauce + Diri ak Pwa Wouj & Zaboka",
    cuisine: "haitian",
    prepNote: "Creole-simmered chicken over red bean rice with sliced avocado and pikliz.",
    proteinId: "poulet-en-sauce",
    carbId: "diri-ak-pwa",
    fatId: "avocado-zaboka",
    produceId: "pikliz",
  },
  {
    id: "haitian-snapper-djondjon",
    slotTypes: ["main"],
    title: "Whole Creole Red Snapper + Diri Djondjon",
    cuisine: "haitian",
    prepNote: "Lime-and-epis marinated snapper paired with fragrant black mushroom rice.",
    proteinId: "pwason-snapper",
    carbId: "diri-djondjon",
    fatId: "avocado-zaboka",
    produceId: "spinach-greens",
  },
  {
    id: "haitian-tassot-cabrit-bannann",
    slotTypes: ["main"],
    title: "Tassot Cabrit (Lean Goat) + Bannann Peze & Pikliz",
    cuisine: "haitian",
    prepNote: "Crisp citrus-braised goat served alongside pressed green plantains and spicy pikliz.",
    proteinId: "tassot-cabrit",
    carbId: "bannann-peze",
    fatId: "avocado-zaboka",
    produceId: "pikliz",
  },
  {
    id: "haitian-griot-diri",
    slotTypes: ["main"],
    title: "Classic Haitian Griot, Diri ak Pwa & Pikliz",
    cuisine: "haitian",
    prepNote: "Traditional sour-orange pork shoulder crisped golden with rice & beans.",
    proteinId: "griot-pork",
    carbId: "diri-ak-pwa",
    fatId: "avocado-zaboka",
    produceId: "pikliz",
  },
  {
    id: "haitian-lambi-yam",
    slotTypes: ["main"],
    title: "Creole Lambi (Conch) + Boiled Yam & Lalo Greens",
    cuisine: "haitian",
    prepNote: "High-protein tender braised conch with Caribbean yam and greens.",
    proteinId: "lambi-conch",
    carbId: "yanm-boiled",
    fatId: "extra-virgin-olive-oil",
    produceId: "lalo-stew",
  },

  // GLOBAL, GYM, MEDITERRANEAN & LATIN MAINS
  {
    id: "gym-chicken-jasmine-broccoli",
    slotTypes: ["main"],
    title: "Char-Grilled Chicken Breast, Jasmine Rice & Broccoli",
    cuisine: "gym",
    prepNote: "Clean, fast-digesting pre- or post-workout staple drizzled with olive oil.",
    proteinId: "chicken-breast",
    carbId: "jasmine-rice",
    fatId: "extra-virgin-olive-oil",
    produceId: "broccoli-roasted",
  },
  {
    id: "gym-steak-sweet-potato",
    slotTypes: ["main"],
    title: "Top Sirloin Steak, Baked Sweet Potato & Asparagus",
    cuisine: "gym",
    prepNote: "Cast-iron seared sirloin with roasted orange sweet potato and grilled asparagus.",
    proteinId: "sirloin-steak",
    carbId: "sweet-potato",
    fatId: "avocado-zaboka",
    produceId: "asparagus-zucchini",
  },
  {
    id: "med-salmon-quinoa",
    slotTypes: ["main"],
    title: "Mediterranean Baked Salmon, Quinoa & Crisp Salad",
    cuisine: "mediterranean",
    prepNote: "Omega-3 rich salmon fillet over fluffy quinoa with cucumber-tomato salad.",
    proteinId: "atlantic-salmon",
    carbId: "quinoa-cooked",
    fatId: "extra-virgin-olive-oil",
    produceId: "mediterranean-salad",
  },
  {
    id: "med-cod-pasta",
    slotTypes: ["main"],
    title: "Lemon-Herb White Cod, Olive Oil Pasta & Greens",
    cuisine: "mediterranean",
    prepNote: "Flaky baked cod over al dente pasta tossed with garlic olive oil and spinach.",
    proteinId: "white-cod-tilapia",
    carbId: "cooked-pasta",
    fatId: "extra-virgin-olive-oil",
    produceId: "spinach-greens",
  },
  {
    id: "latin-beef-burrito-bowl",
    slotTypes: ["main"],
    title: "93/7 Lean Beef, Rice, Black Beans & Avocado Bowl",
    cuisine: "latin",
    prepNote: "Cumin-lime lean ground beef over jasmine rice, black beans, and fresh avocado.",
    proteinId: "lean-ground-beef",
    carbId: "black-beans",
    fatId: "avocado-zaboka",
    produceId: "mediterranean-salad",
  },
  {
    id: "latin-shrimp-plantain",
    slotTypes: ["main"],
    title: "Garlic-Lime Grilled Shrimp, Sweet Plantains & Rice",
    cuisine: "latin",
    prepNote: "Fast 10-minute skillet shrimp with caramelized ripe plantains.",
    proteinId: "shrimp-cooked",
    carbId: "maduros-plantain",
    fatId: "avocado-zaboka",
    produceId: "mediterranean-salad",
  },
  {
    id: "vegan-tofu-rice-edamame",
    slotTypes: ["main"],
    title: "Crispy Glazed Tofu, Jasmine Rice & Broccoli",
    cuisine: "gym",
    prepNote: "Pan-seared extra-firm tofu cubes with steamed rice, broccoli, and sesame/olive oil.",
    proteinId: "extra-firm-tofu",
    carbId: "jasmine-rice",
    fatId: "avocado-zaboka",
    produceId: "broccoli-roasted",
  },
  {
    id: "vegan-tempeh-sweet-potato",
    slotTypes: ["main"],
    title: "Smoky Tempeh, Black Beans, Sweet Potato & Avocado",
    cuisine: "latin",
    prepNote: "High-protein plant power bowl with roasted sweet potato wedges.",
    proteinId: "tempeh-organic",
    carbId: "sweet-potato",
    fatId: "avocado-zaboka",
    produceId: "spinach-greens",
  },
  {
    id: "veg-cottage-fruit-nuts",
    slotTypes: ["snack", "breakfast"],
    title: "Cottage Cheese, Pineapple & Roasted Almonds",
    cuisine: "gym",
    prepNote: "Zero-cook high-casein snack bowl ready in 90 seconds.",
    proteinId: "cottage-cheese",
    carbId: "pineapple-chunks",
    fatId: "raw-almonds",
  },
  {
    id: "cream-of-rice-whey-post",
    slotTypes: ["snack", "breakfast"],
    title: "Post-Lift Cream of Rice, Whey Isolate & Peanut Butter",
    cuisine: "gym",
    prepNote: "Rapid glycogen + leucine replenishment bowl.",
    proteinId: "whey-isolate",
    carbId: "cream-of-rice",
    fatId: "natural-peanut-butter",
    produceId: "banana-fresh",
  },
];

function findFood(id: string): WorldFoodItem {
  return (
    BUILTIN_WORLD_FOODS.find((f) => f.id === id) || BUILTIN_WORLD_FOODS[0]
  );
}

function templateAllowed(tpl: MealTemplate, pref: MealPlanPreferences): boolean {
  const foods = [
    findFood(tpl.proteinId),
    findFood(tpl.carbId),
    findFood(tpl.fatId),
    ...(tpl.produceId ? [findFood(tpl.produceId)] : []),
  ];

  const excluded = pref.excludeText
    .toLowerCase()
    .split(/,|;|\s+/)
    .map((s) => s.trim().replace(/ies$/, "y").replace(/s$/, ""))
    .filter((s) => s.length >= 3);

  for (const f of foods) {
    if (pref.diet === "vegan" && !f.tags.includes("vegan")) return false;
    if (pref.diet === "vegetarian" && !f.tags.includes("vegetarian"))
      return false;
    if (pref.diet === "pescatarian" && !f.tags.includes("pescatarian"))
      return false;
    if (pref.diet === "halal_no_pork" && !f.tags.includes("pork-free"))
      return false;
    if (pref.dairyFree && !f.tags.includes("dairy-free")) return false;
    if (pref.glutenFree && !f.tags.includes("gluten-free")) return false;
    const low = f.name.toLowerCase();
    if (excluded.some((ex) => low.includes(ex))) return false;
  }
  return true;
}

function buildScaledMeal(
  tpl: MealTemplate,
  slotIndex: number,
  slotName: string,
  targetKcal: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number,
): PlannedMeal {
  const pFood = findFood(tpl.proteinId);
  const cFood = findFood(tpl.carbId);
  const fFood = findFood(tpl.fatId);
  const vFood = tpl.produceId ? findFood(tpl.produceId) : null;

  const vGrams = vFood ? vFood.servingGrams : 0;
  const vMac = vFood ? macrosForGrams(vFood, vGrams) : { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

  // 1. Scale protein food to cover ~82% of meal protein target
  const pPer100 = Math.max(8, pFood.protein100);
  const pGramsRaw = ((targetProtein * 0.82) / pPer100) * 100;
  const pGrams = Math.max(
    25,
    Math.min(pFood.kcal100 > 300 ? 75 : 340, Math.round(pGramsRaw / 5) * 5),
  );
  const pMac = macrosForGrams(pFood, pGrams);

  // 2. Scale carb food to cover remaining carbs
  const remCarbs = Math.max(10, targetCarbs - pMac.carbsG - vMac.carbsG);
  const cPer100 = Math.max(12, cFood.carbs100);
  const cGramsRaw = (remCarbs / cPer100) * 100;
  const cGrams = Math.max(
    30,
    Math.min(cFood.kcal100 > 300 ? 130 : 380, Math.round(cGramsRaw / 5) * 5),
  );
  const cMac = macrosForGrams(cFood, cGrams);

  // 3. Scale fat food to cover remaining calories / fat
  const usedKcal = pMac.calories + cMac.calories + vMac.calories;
  const remKcal = Math.max(35, targetKcal - usedKcal);
  const fGramsRaw = (remKcal / Math.max(120, fFood.kcal100)) * 100;
  const fGrams = Math.max(
    8,
    Math.min(fFood.kcal100 > 500 ? 45 : 140, Math.round(fGramsRaw / 2) * 2),
  );
  const fMac = macrosForGrams(fFood, fGrams);

  const rawRows: { food: WorldFoodItem; grams: number }[] = [
    { food: pFood, grams: pGrams },
    { food: cFood, grams: cGrams },
    { food: fFood, grams: fGrams },
    ...(vFood ? [{ food: vFood, grams: vGrams }] : []),
  ];

  const ingredients: PlannedMealIngredient[] = rawRows.map(({ food, grams }) => {
    const m = macrosForGrams(food, grams);
    const oz = (grams / 28.35).toFixed(1);
    return {
      food,
      grams,
      household: `${grams}g (${oz} oz)`,
      calories: m.calories,
      proteinG: m.proteinG,
      carbsG: m.carbsG,
      fatG: m.fatG,
    };
  });

  const totals = ingredients.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      proteinG: Math.round((acc.proteinG + i.proteinG) * 10) / 10,
      carbsG: Math.round((acc.carbsG + i.carbsG) * 10) / 10,
      fatG: Math.round((acc.fatG + i.fatG) * 10) / 10,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  return {
    slotIndex,
    slotName,
    title: tpl.title,
    cuisineBadge:
      tpl.cuisine === "haitian"
        ? "Haitian / Caribbean"
        : tpl.cuisine === "mediterranean"
          ? "Mediterranean"
          : tpl.cuisine === "latin"
            ? "Latin"
            : "High-Protein Athlete",
    prepNote: tpl.prepNote,
    templateId: tpl.id,
    ingredients,
    totals,
  };
}

export function generatePreferenceMealPlan(
  pref: MealPlanPreferences,
  seedOffset: number = 0,
): GeneratedMealPlan {
  const slotNames =
    pref.mealsPerDay === 3
      ? ["Breakfast", "Lunch", "Dinner"]
      : pref.mealsPerDay === 4
        ? ["Breakfast", "Lunch", "Post-Workout Fuel", "Dinner"]
        : ["Breakfast", "Mid-Morning", "Lunch", "Post-Workout", "Dinner"];

  const allowed = MEAL_TEMPLATES.filter((t) => templateAllowed(t, pref));
  const pool = allowed.length ? allowed : MEAL_TEMPLATES;

  const prioritized = [...pool].sort((a, b) => {
    const aMatch = pref.cuisine !== "all" && a.cuisine === pref.cuisine ? 1 : 0;
    const bMatch = pref.cuisine !== "all" && b.cuisine === pref.cuisine ? 1 : 0;
    return bMatch - aMatch;
  });

  const usedIds = new Set<string>();
  const meals: PlannedMeal[] = [];

  for (let i = 0; i < slotNames.length; i++) {
    const slotName = slotNames[i];
    const desiredType: "breakfast" | "main" | "snack" =
      i === 0
        ? "breakfast"
        : slotName.includes("Post") || slotName.includes("Morning")
          ? "snack"
          : "main";

    const slotCandidates = prioritized.filter((t) =>
      t.slotTypes.includes(desiredType),
    );
    const list = slotCandidates.length ? slotCandidates : prioritized;
    const chosen =
      list.find((t, idx) => !usedIds.has(t.id) && idx >= (seedOffset % list.length)) ||
      list[(i + seedOffset) % list.length];
    usedIds.add(chosen.id);

    const share =
      desiredType === "snack"
        ? 1 / (slotNames.length + 0.6)
        : (1 + 0.6 / Math.max(1, slotNames.length - 1)) /
          (slotNames.length + 0.6);
    const weightShare =
      pref.mealsPerDay === 3 ? 1 / 3 : share;

    meals.push(
      buildScaledMeal(
        chosen,
        i,
        slotName,
        pref.calories * weightShare,
        pref.proteinG * weightShare,
        pref.carbsG * weightShare,
        pref.fatG * weightShare,
      ),
    );
  }

  // Aggregate totals & grocery list
  const dayTotals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.totals.calories,
      proteinG: Math.round((acc.proteinG + m.totals.proteinG) * 10) / 10,
      carbsG: Math.round((acc.carbsG + m.totals.carbsG) * 10) / 10,
      fatG: Math.round((acc.fatG + m.totals.fatG) * 10) / 10,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  const groceryMap = new Map<
    string,
    { name: string; totalGrams: number; category: string }
  >();
  for (const m of meals) {
    for (const ing of m.ingredients) {
      const prev = groceryMap.get(ing.food.id);
      if (prev) prev.totalGrams += ing.grams;
      else
        groceryMap.set(ing.food.id, {
          name: ing.food.name,
          totalGrams: ing.grams,
          category: ing.food.category,
        });
    }
  }

  return {
    preferences: pref,
    meals,
    dayTotals,
    groceryList: Array.from(groceryMap.values()),
  };
}

export function swapSingleMealInPlan(
  plan: GeneratedMealPlan,
  slotIndex: number,
  step: number = 1,
): GeneratedMealPlan {
  const current = plan.meals[slotIndex];
  if (!current) return plan;
  const allowed = MEAL_TEMPLATES.filter((t) =>
    templateAllowed(t, plan.preferences),
  );
  const pool = allowed.length ? allowed : MEAL_TEMPLATES;
  const idx = pool.findIndex((t) => t.id === current.templateId);
  const nextTpl = pool[(Math.max(0, idx) + step) % pool.length];

  const rebuilt = buildScaledMeal(
    nextTpl,
    slotIndex,
    current.slotName,
    current.totals.calories,
    current.totals.proteinG,
    current.totals.carbsG,
    current.totals.fatG,
  );
  const nextMeals = plan.meals.map((m, i) => (i === slotIndex ? rebuilt : m));
  const dayTotals = nextMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.totals.calories,
      proteinG: Math.round((acc.proteinG + m.totals.proteinG) * 10) / 10,
      carbsG: Math.round((acc.carbsG + m.totals.carbsG) * 10) / 10,
      fatG: Math.round((acc.fatG + m.totals.fatG) * 10) / 10,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
  const groceryMap = new Map<
    string,
    { name: string; totalGrams: number; category: string }
  >();
  for (const m of nextMeals) {
    for (const ing of m.ingredients) {
      const prev = groceryMap.get(ing.food.id);
      if (prev) prev.totalGrams += ing.grams;
      else
        groceryMap.set(ing.food.id, {
          name: ing.food.name,
          totalGrams: ing.grams,
          category: ing.food.category,
        });
    }
  }
  return {
    ...plan,
    meals: nextMeals,
    dayTotals,
    groceryList: Array.from(groceryMap.values()),
  };
}
