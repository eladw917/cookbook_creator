RECIPE_EXTRACTION_PROMPT = """
PROMPT: Recipe Standardization from YouTube Video


You will be provided with content from a YouTube recipe video in JSON format that includes:
1. Video title (typically a catchy YouTube-style title)
2. Video description (may contain ingredients, notes, or other recipe information)
3. Video transcript as a list of text segments in chronological order (the order they appear in the video)


Your task is to extract the recipe information from these sources and convert it into a standardized JSON format.


**IMPORTANT: The output must ALWAYS be in English, regardless of the language of the input video title, description, or transcript.**


Convert the recipe into this standardized JSON format with these exact specifications:


**OUTPUT JSON STRUCTURE:**
{{
 "title": "Recipe Title in Title Case",
 "description": "A compelling 2-4 sentence description of the recipe",
 "servings": "Serves: X" or "Yields: X units",
 "prep_time": "X minutes/hours",
 "cook_time": "X minutes/hours",
 "total_time": "X minutes/hours",
 "difficulty": "Easy" | "Intermediate" | "Advanced",
 "ingredients": [
   {{
     "quantity": "numeric value or range",
     "unit": "measurement unit or 'unit'/'units'",
     "ingredient": "ingredient name with preparation notes if needed",
     "purpose": "cooking purpose or phase"
   }}
 ],
 "instructions": [
   {{
     "step_number": 1,
     "category": "Prep" | "Cook" | "Plate/Finalize/Serve",
     "instruction": "Detailed instruction text",
     "is_key_step": true
   }}
 ]
}}


**FIELD SPECIFICATIONS:**


**title**
- Single line, title case
- Should be descriptive and appetizing
- Extract from the video title, but refine it to be clear and recipe-focused
- Remove YouTube clickbait elements (e.g., "BEST EVER", "You Won't Believe", emojis, all caps)
- Keep the core dish name and any key descriptors (e.g., "Restaurant-Style Guacamole", "Crispy Oven-Baked Chicken")
- Translate to English if in another language


**description**
- A compelling, informative description of the recipe (2-4 sentences, approximately 50-100 words)
- Extract contextual information from the video transcript and description
- Should include:
  - General overview: What the dish is and what makes it special or unique
  - Occasions/use cases: What it's good for (e.g., "perfect for summer gatherings", "ideal comfort food")
  - Dish type/cuisine: Type of dish and cuisine style if mentioned (e.g., "Italian classic", "Asian-inspired fusion")
  - When to eat: Meal timing or seasonal context (e.g., "great for breakfast", "winter warmer", "light lunch")
  - Background/context: Cultural background, origin story, or interesting facts if mentioned in the video
- Tone: Warm, inviting, and appetizing - make readers want to cook this dish
- Focus on benefits and appeal rather than just restating ingredients
- Extract from what the chef says in the transcript, not just the video metadata
- Example: "This classic French ratatouille is a celebration of summer vegetables at their peak. Perfect as a light main course or hearty side dish, it's ideal for al fresco dining. The slow-roasting technique brings out incredible depth of flavor, making it a favorite in Provence for generations."


**servings**
- Format: "Serves: [number]" OR "Yields: [quantity and unit]"
- Be specific (e.g., "Serves: 4-6" or "Yields: 24 cookies")
- If not explicitly stated, estimate based on the recipe


**prep_time, cook_time, total_time**
- Format: "[X] minutes" or "[X] hours"
- Extract from description or estimate based on the transcript
- total_time should equal prep + cook + any passive time (cooling, resting, etc.)


**difficulty**
- Choose one: "Easy", "Intermediate", or "Advanced"
- Guidelines:
 - Easy: Minimal skills, basic techniques, few steps
 - Intermediate: Some cooking experience needed, multiple techniques
 - Advanced: Complex techniques, precise timing, many components
- Base this on the complexity shown in the video


**ingredients**
- Array of ingredient objects
- Extract all ingredients from the description and/or transcript
- List in order of use
- quantity: numeric value (e.g., "3", "1/2", "1/4")
- unit: standard measurements (cups, tablespoons, teaspoons, ounces, grams, ml, etc.)
 - For countable items, use "units" (plural) or "unit" (singular)
 - Use "-" for items without specific quantities
- ingredient: name of ingredient with preparation details (e.g., "diced", "minced", "at room temperature")
- purpose: the cooking purpose or phase when this ingredient is used (e.g., "dough", "sauce", "garnish", "marinating", "cooking")
  - Default to "cooking" unless the ingredient serves a specific purpose in a distinct phase
  - Common purposes: "dough", "sauce", "filling", "garnish", "marinating", "brining", "batter", "crust", "frosting", "glaze"
  - Base categorization on when and how the ingredient is used in the recipe process
  - If an ingredient is used for multiple purposes, list it for each purpose with the respecive quantity and unit
- Group ingredients by component if recipe has multiple parts (add ingredient objects with descriptive text like "For the dough:")
- If measurements are mentioned in the transcript but not the description, use those


**instructions**
- Array of instruction objects
- Extract steps from the video transcript list in chronological order
- step_number: sequential number starting from 1
- category: "Prep", "Cook", or "Plate/Finalize/Serve"
 - Prep: All preparation work before cooking begins (chopping, measuring, mixing, preheating)
 - Cook: Active cooking process (sautéing, baking, boiling, frying, simmering)
 - Plate/Finalize/Serve: Assembly, presentation, garnishing, and final touches
- instruction: Clear, detailed step
 - Use imperative/command form (start with verbs: "Preheat", "Mix", "Add", "Cook")
 - Be specific about temperatures, times, and visual cues mentioned in the video
 - Include "why" when helpful (e.g., "until golden brown" or "until doubled in size")
 - Ignore filler words and casual conversation - focus only on actual cooking instructions
 - CRITICAL: Do NOT repeat ingredient quantities in instructions. Simply refer to ingredient by name (e.g., "Add flour" not "Add 300g flour")
 - EXCEPTION: Only specify quantities if using a portion of an ingredient (e.g., "Add half of the milk" or "Reserve 2 tablespoons of the mixture")
- is_key_step: ONLY include this field when the value is true
 - Mark steps where a visual/image would be most important for understanding the recipe
 - Key steps typically include: critical technique demonstrations, visual doneness checks, assembly stages, plating/presentation, or transformation moments
 - REQUIREMENTS:
   * Target approximately 1/4 (25%) of total steps as key steps. Do NOT exceed 40%.
   * Minimum 3 key steps per recipe
   * Distribute key steps throughout the recipe (prep, cook, and serve phases)
 - Examples of key steps: "until edges are golden brown", "fold gently until combined", "flip crêpe", "mash until chunky", "final plating"
 - IMPORTANT: Do NOT include "is_key_step": false. Only add "is_key_step": true when a step is key.
 - CRITICAL: Do NOT mark every step as a key step. Most steps should NOT have this field. If you mark every step, you have failed.


---


Now please convert this recipe:


INPUT JSON:


{input_data}
"""
