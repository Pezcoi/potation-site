// Wait until the page controls exist before wiring up their events.
document.addEventListener('DOMContentLoaded', () => {
  const themeButton = document.getElementById('theme-toggle');
  const form = document.getElementById('nutrition-form');
  const gramsInput = document.getElementById('potato-grams');
  const foodSelect = document.getElementById('potato-type');
  const errorMessage = document.getElementById('calculator-error');
  const results = document.getElementById('nutrition-results');

  // Apply a saved theme, or follow the visitor's device preference the first time.
  const savedTheme = readSavedTheme();
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

  themeButton.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('potato-site-theme', nextTheme);
    } catch {
      // Theme switching still works when browser storage is unavailable.
    }
  });

  // The dataset keeps all nutrient values on the same per-100-gram basis.
  loadNutritionData();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    errorMessage.textContent = '';

    const grams = Number(gramsInput.value);
    if (gramsInput.value.trim() === '' || !Number.isFinite(grams) || grams < 1 || grams > 10000) {
      errorMessage.textContent = 'Enter a valid amount from 1 to 10,000 grams.';
      gramsInput.focus();
      return;
    }

    const food = foodSelect.selectedOptions[0]?.dataset.food;
    if (!food) {
      errorMessage.textContent = 'Nutrition data is not ready yet. Please try again in a moment.';
      foodSelect.focus();
      return;
    }

    showNutritionEstimate(food, grams);
  });

  async function loadNutritionData() {
    try {
      const response = await fetch('potato_nutrition_dataset.json');
      if (!response.ok) throw new Error(`Dataset request failed: ${response.status}`);

      const dataset = await response.json();
      if (!Array.isArray(dataset.foods) || dataset.foods.length === 0) {
        throw new Error('The nutrition dataset has no food entries.');
      }

      foodSelect.replaceChildren();
      dataset.foods.forEach((food) => {
        const option = document.createElement('option');
        option.value = food.id;
        option.textContent = food.name;
        option.dataset.food = JSON.stringify(food);
        foodSelect.append(option);
      });
      foodSelect.disabled = false;
    } catch (error) {
      foodSelect.replaceChildren(new Option('Nutrition data could not be loaded', ''));
      errorMessage.textContent = 'Could not load the nutrition dataset. Open this page through a local web server and try again.';
      console.error('Unable to load potato nutrition data:', error);
    }
  }

  // Multiply each per-100-g nutrient by the selected portion size.
  function showNutritionEstimate(food, grams) {
    const multiplier = grams / 100;
    const units = {
      energy_kcal: ['Calories', 'kcal', 0],
      water_g: ['Water', 'g', 1],
      carbohydrates_g: ['Carbohydrates', 'g', 1],
      sugars_g: ['Sugars', 'g', 1],
      fiber_g: ['Fiber', 'g', 1],
      protein_g: ['Protein', 'g', 1],
      fat_g: ['Fat', 'g', 1],
      vitamin_c_mg: ['Vitamin C', 'mg', 1],
      vitamin_b6_mg: ['Vitamin B6', 'mg', 2],
      potassium_mg: ['Potassium', 'mg', 1],
      magnesium_mg: ['Magnesium', 'mg', 1],
      phosphorus_mg: ['Phosphorus', 'mg', 1],
      iron_mg: ['Iron', 'mg', 2],
      sodium_mg: ['Sodium', 'mg', 1]
    };

    const heading = document.createElement('h4');
    heading.textContent = `Estimated nutrition for ${formatNumber(grams)} g`;
    const foodName = document.createElement('p');
    foodName.className = 'result-food-name';
    foodName.textContent = food.name;

    const table = document.createElement('table');
    table.className = 'result-table';
    const body = document.createElement('tbody');

    Object.entries(units).forEach(([key, [label, unit, decimals]]) => {
      const amount = food.nutrients_per_100g?.[key];
      if (!Number.isFinite(amount)) return;

      const row = document.createElement('tr');
      const nameCell = document.createElement('th');
      const amountCell = document.createElement('td');
      nameCell.scope = 'row';
      nameCell.textContent = label;
      amountCell.textContent = `${formatNumber(amount * multiplier, decimals)} ${unit}`;
      row.append(nameCell, amountCell);
      body.append(row);
    });

    table.append(body);
    results.replaceChildren(heading, foodName, table);
  }

  function formatNumber(value, maximumFractionDigits = 1) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value);
  }

  function readSavedTheme() {
    try {
      const theme = localStorage.getItem('potato-site-theme');
      return theme === 'dark' || theme === 'light' ? theme : null;
    } catch {
      return null;
    }
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeButton.textContent = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
    document.documentElement.style.colorScheme = theme;
  }
});
