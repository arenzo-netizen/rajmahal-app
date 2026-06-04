// Mittagsangebote · Mo–Fr · 11:00–14:00 Uhr
// Exakt aus der Speisekarte (Fotos)

export const LUNCH_HOURS = { start: 11, end: 14 };
export const LUNCH_DAYS = [1, 2, 3, 4, 5]; // Mo–Fr

export interface LunchItem {
  id: string;
  nr: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  price: number;
  vegetarian?: boolean;
  vegan?: boolean;
  spicy?: number;
}

export const lunchItems: LunchItem[] = [
  {
    id: "ln550", nr: "550",
    name: "Vegetable Biryani",
    nameEn: "Vegetable Biryani",
    description: "Safran-Basmati Reis gebraten mit hausgemachtem Käse, Erbsen und Gemüse, serviert mit Joghurt",
    descriptionEn: "Saffron basmati rice fried with homemade cheese, peas and vegetables, served with yoghurt",
    price: 8.50, vegetarian: true,
  },
  {
    id: "ln551", nr: "551",
    name: "Murgh Biryani",
    nameEn: "Murgh Biryani",
    description: "Safran-Basmati Reis gebraten mit Hühnerfilet und Nüsse, serviert mit Joghurt",
    descriptionEn: "Saffron basmati rice fried with chicken fillet and nuts, served with yoghurt",
    price: 8.50,
  },
  {
    id: "ln567", nr: "567",
    name: "Chicken Curry",
    nameEn: "Chicken Curry",
    description: "Hähnchenbrustfilet, trockenen Gewürzen",
    descriptionEn: "Chicken breast fillet with dry spices",
    price: 9.50, spicy: 1,
  },
  {
    id: "ln573", nr: "573",
    name: "Chicken Korma",
    nameEn: "Chicken Korma",
    description: "Hähnchenbrustfilet in einer milden Sauce aus Mandeln, Cashew, Käse und Sahne",
    descriptionEn: "Chicken breast fillet in a mild sauce of almonds, cashew, cheese and cream",
    price: 9.50,
  },
  {
    id: "ln600", nr: "600",
    name: "Channa Masala",
    nameEn: "Channa Masala",
    description: "Kichererbsen und Kartoffeln zubereitet mit indischen Gewürzen in Currysauce",
    descriptionEn: "Chickpeas and potatoes with Indian spices in curry sauce",
    price: 8.50, vegetarian: true, vegan: true, spicy: 1,
  },
  {
    id: "ln601", nr: "601",
    name: "Sabzi Vindaloo",
    nameEn: "Sabzi Vindaloo",
    description: "Gemischtes Gemüse mit trockenen Gewürzen (sehr scharf) in sehr scharfer Currysauce",
    descriptionEn: "Mixed vegetables with dry spices (very hot) in very hot curry sauce",
    price: 9.00, vegetarian: true, vegan: true, spicy: 3,
  },
  {
    id: "ln602", nr: "602",
    name: "Palak Paneer",
    nameEn: "Palak Paneer",
    description: "Spinat mit hausgemachtem Käse und indischen Gewürzen",
    descriptionEn: "Spinach with homemade cheese and Indian spices",
    price: 9.00, vegetarian: true, spicy: 1,
  },
  {
    id: "ln604", nr: "604",
    name: "Alu Gobhi",
    nameEn: "Alu Gobhi",
    description: "Frische Kartoffeln und Blumenkohl in verschiedenen Gewürzen gebraten",
    descriptionEn: "Fresh potatoes and cauliflower fried in various spices",
    price: 9.00, vegetarian: true, vegan: true, spicy: 1,
  },
  {
    id: "ln607", nr: "607",
    name: "Dal Makhni",
    nameEn: "Dal Makhni",
    description: "Schwarz Linsen zubereitet mit Butter, Knoblauch, Ingwer, Tomaten und verschiedenen Gewürzen",
    descriptionEn: "Black lentils with butter, garlic, ginger, tomatoes and various spices",
    price: 9.00, vegetarian: true,
  },
];

export function isLunchTime(): boolean {
  const now = new Date();
  const day = now.getDay();
  const totalMins = now.getHours() * 60 + now.getMinutes();
  return (
    LUNCH_DAYS.includes(day) &&
    totalMins >= LUNCH_HOURS.start * 60 &&
    totalMins < LUNCH_HOURS.end * 60
  );
}
