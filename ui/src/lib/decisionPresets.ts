import type { LayaQuestion } from "./layaApi";

export type DecisionPreset = {
  id: string;
  label: string;
  description: string;
  state: string | Record<string, unknown> | unknown[];
  questions: Record<string, LayaQuestion>;
};

/** The preset shown when the Decisions tab is opened or cleared. */
export const DEFAULT_DECISION_PRESET_ID = "support-ticket";

const supportTicketState = "I was charged twice. Please refund the duplicate payment.";

const homeAutomationState = {
  event: "Leaving for work at 07:15, no meetings before 10:00.",
  devices: {
    heating: "21°C, windows closed overnight, morning schedule done",
    ventilation: "off, bedroom CO2 1450 ppm",
    lighting: "4 indoor lights on, outdoor on auto",
    shading: "blinds closed, sun protection idle",
    pv_storage: "PV 180 W, forecast 6 kWh, battery 42%, peak tariff until 08:00",
    ev: "plugged in at 34%, charger enabled, needs 60% for the trip",
    water: "booster running, no leak alarm",
    security: "armed away at 07:02, doors and windows closed",
  },
  weather: "-2°C, wind 12 km/h, sunny after 09:00",
};

const homeAutomationCriteria = {
  heating: "thermostat and radiator valves",
  ventilation: "comfort ventilation and air quality",
  shading: "blinds, shutters and awnings",
  lighting: "indoor and outdoor lights and scenes",
  cooling: "air conditioning and night purge",
  alarms: "burglar, smoke, water and fault alarms",
  presence: "presence simulation and occupancy",
  automation: "rules, schedules and triggers",
  scenes: "predefined mood and routine scenes",
  energy: "power metering, tariffs and load shifting",
  pv: "photovoltaics, inverter and battery",
  storage: "battery storage and self consumption",
  ev_charging: "car charging and charge windows",
  weather: "weather forecasts and sun protection",
  maintenance: "service intervals, filters and faults",
  guests: "guest access, doorbell and intercom",
  entertainment: "audio zones, radio and speakers",
  security: "armed state, doors and cameras",
  humidity: "dehumidifier, pool and spa",
  watering: "garden irrigation and lawn",
};

const routingState = [
  '**Why the Event Loop Starves in Node.js**',
  '',
  'Node.js runs on a *single-threaded* event loop. Long-running `fs.readFileSync()` calls',
  'block pending I/O callbacks and inflate tail latency.',
  '',
  '```js',
  'const data = fs.readFileSync(path); // blocks the loop',
  'const res = await fetch(url);       // yields control',
  '```',
].join('\n');

const chessState = {
  fen: "7k/8/5KQ1/8/8/8/8/8 w - - 0 1",
  clocks: "White 5:04, Black 1:48, no increment",
};

const kitchenState = `It's 18:40 on a Friday. Four guests arrive at 19:30. I have chicken thighs, heavy cream, frozen puff pastry, leeks, mushrooms, an egg, and Dijon mustard. The oven is free.`;

const tripState = `I'm 32 years old, travelling solo for 10 days in February, budget 2000 EUR, starting from Vienna. I like hiking and museums, dislike crowds and long flights, and I want to avoid both extreme cold and monsoon rain.`;

export const DECISION_PRESETS: DecisionPreset[] = [
  {
    id: DEFAULT_DECISION_PRESET_ID,
    label: "Support ticket triage",
    description: "Route a duplicate-charge complaint to a department, refund yes/no, urgency score.",
    state: supportTicketState,
    questions: {
      department: {
        type: "choice",
        instructions: "Which department should handle this request?",
        criteria: {
          billing: "payments, invoices and refunds",
          technical: "software bugs and outages",
          other: "everything else",
        },
      },
      refund_requested: {
        type: "noul",
        instructions: "Does the customer explicitly request a refund?",
      },
      urgency: {
        type: "score",
        instructions: "How urgent is this request?",
        criteria: ["low", "normal", "critical"],
      },
    },
  },
  {
    id: "home-automation",
    label: "Home automation (20 options)",
    description:
      "Current device, weather and energy state plus a departure request, classified across 20 smart-home domains.",
    state: homeAutomationState,
    questions: {
      domain: {
        type: "choice",
        instructions: "Which home automation domain should act on this situation?",
        criteria: homeAutomationCriteria,
      },
      energy_optimization: {
        type: "noul",
        instructions: "Is there a clear energy optimization opportunity in this situation?",
      },
      impact: {
        type: "score",
        instructions: "How much would acting on this situation improve comfort, cost or safety?",
        criteria: ["negligible", "minor", "moderate", "significant"],
      },
    },
  },
  {
    id: "model-routing",
    label: "Model routing",
    description: "Prose or code, expected difficulty, and which model tier should answer.",
    state: routingState,
    questions: {
      content_kind: {
        type: "choice",
        instructions: "What kind of content is this request?",
        criteria: {
          prose: "writing, summarizing and rewriting of natural language",
          code: "source code, snippets and technical documentation with code",
          structured_data: "tables, JSON or CSV to transform",
          math: "formulas, calculations and proofs",
        },
      },
      difficulty: {
        type: "score",
        instructions: "How difficult is the reasoning this request requires?",
        criteria: ["trivial", "easy", "medium", "hard", "expert"],
      },
      thinking_high: {
        type: "noul",
        instructions: "Should the model answer with an elevated thinking (reasoning) effort level?",
      },
      model_tier: {
        type: "choice",
        instructions: "Which model tier should handle this request?",
        criteria: {
          small_fast: "small instruct model, lowest latency and cost",
          medium: "mid sized general model",
          large_reasoning: "large model with extended reasoning",
          specialist: "code or domain specific model",
        },
      },
    },
  },
  {
    id: "chess-move",
    label: "Chess position",
    description:
      "FEN and clocks of a position to move: material balance, evaluation, tactic present, and the next move.",
    state: chessState,
    questions: {
      material: {
        type: "choice",
        instructions: "What is the material balance in this position?",
        criteria: {
          white_up: "White is up material",
          equal: "material is equal",
          black_up: "Black is up material",
        },
      },
      evaluation: {
        type: "score",
        instructions: "From the point of view of the side to move, how favorable is the position, from losing to winning?",
        criteria: ["lost", "slightly_worse", "equal", "slightly_better", "winning"],
      },
      tactic_present: {
        type: "noul",
        instructions: "Is there a forcing tactical shot for the side to move?",
      },
      candidate_move: {
        type: "choice",
        instructions: "Which is the best move in this position?",
        criteria: {
          Qg7: "move queen to g7",
          Qh7: "move queen to h7",
          Qg8: "move queen to g8",
          Qe8: "move queen to e8",
          Qh6: "move queen to h6",
          Qh5: "move queen to h5",
          Qf7: "move queen to f7",
          Qg5: "move queen to g5",
          Qf5: "move queen to f5",
          Qg4: "move queen to g4",
          Qe4: "move queen to e4",
          Qg3: "move queen to g3",
          Qd3: "move queen to d3",
          Qg2: "move queen to g2",
          Qc2: "move queen to c2",
          Qg1: "move queen to g1",
          Qb1: "move queen to b1",
          Kf7: "move king to f7",
          Ke7: "move king to e7",
          Ke6: "move king to e6",
          Kg5: "move king to g5",
          Kf5: "move king to f5",
          Ke5: "move king to e5",
        },
      },
    },
  },
  {
    id: "dinner-decision",
    label: "What's for dinner",
    description: "Pick a recipe from the fridge, decide how long it may take, rate feasibility.",
    state: kitchenState,
    questions: {
      dish_family: {
        type: "choice",
        instructions: "Which dish can realistically be made from the available ingredients?",
        criteria: {
          chicken_pot_pie: "savoury chicken pie in pastry",
          carbonara: "pasta with egg, cream and cheese",
          risotto: "slow-stirred rice dish",
          soup_bread: "soup with a starter",
          stir_fry_rice: "quick stir fry with rice",
        },
      },
      needs_extra_shopping: {
        type: "noul",
        instructions: "Would this dish still require a shopping trip?",
      },
      feasibility: {
        type: "score",
        instructions: "How feasible is the best option within the remaining time before guests arrive?",
        criteria: ["impossible", "risky", "achievable", "comfortable"],
      },
    },
  },
  {
    id: "trip-destination",
    label: "Trip shortlist",
    description: "Shortlist a destination, check visa work, score the fit with traveller preferences.",
    state: tripState,
    questions: {
      destination: {
        type: "choice",
        instructions: "Which destination best matches the traveller's constraints?",
        criteria: {
          canary_islands: "volcanic islands with mild winter hiking",
          madeira: "subtropical island with levada walks",
          andalusia: "southern Spain, culture and short flight",
          morocco: "desert and mountains, short flight",
          thailand: "long haul, tropical, cultural",
          iceland: "north Atlantic, dark and cold in winter",
        },
      },
      needs_visa_paperwork: {
        type: "noul",
        instructions: "Does this destination require visa or entry paperwork for an Austrian citizen?",
      },
      preference_fit: {
        type: "score",
        instructions: "How well does the best matching destination fit the stated preferences?",
        criteria: ["poor", "fair", "good", "excellent"],
      },
    },
  },
];

export function decisionPresetById(id: string | null | undefined): DecisionPreset | undefined {
  return DECISION_PRESETS.find((preset) => preset.id === id);
}

export function formatPresetState(state: DecisionPreset["state"]): string {
  return typeof state === "string" ? state : JSON.stringify(state, null, 2);
}

export function formatPresetQuestions(questions: DecisionPreset["questions"]): string {
  return JSON.stringify(questions, null, 2);
}
