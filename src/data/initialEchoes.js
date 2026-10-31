export const THEME_PALETTES = [
  {
    id: "crimson-regret",
    name: "Crimson Regret",
    color: "#fc2904",
    secondary: "#ff4b2b",
    bg: "rgba(252, 41, 4, 0.08)",
    border: "rgba(252, 41, 4, 0.35)",
    glow: "rgba(252, 41, 4, 0.25)"
  },
  {
    id: "midnight-sorrow",
    name: "Midnight Sorrow",
    color: "#818cf8",
    secondary: "#6366f1",
    bg: "rgba(99, 102, 241, 0.08)",
    border: "rgba(99, 102, 241, 0.35)",
    glow: "rgba(99, 102, 241, 0.25)"
  },
  {
    id: "amber-nostalgia",
    name: "Amber Nostalgia",
    color: "#fbbf24",
    secondary: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.08)",
    border: "rgba(245, 158, 11, 0.35)",
    glow: "rgba(245, 158, 11, 0.25)"
  },
  {
    id: "ocean-solitude",
    name: "Ocean Solitude",
    color: "#38bdf8",
    secondary: "#0284c7",
    bg: "rgba(56, 189, 248, 0.08)",
    border: "rgba(56, 189, 248, 0.35)",
    glow: "rgba(56, 189, 248, 0.25)"
  },
  {
    id: "emerald-peace",
    name: "Emerald Peace",
    color: "#34d399",
    secondary: "#059669",
    bg: "rgba(52, 211, 153, 0.08)",
    border: "rgba(52, 211, 153, 0.35)",
    glow: "rgba(52, 211, 153, 0.25)"
  },
  {
    id: "violet-whisper",
    name: "Violet Whisper",
    color: "#c084fc",
    secondary: "#9333ea",
    bg: "rgba(192, 132, 252, 0.08)",
    border: "rgba(192, 132, 252, 0.35)",
    glow: "rgba(192, 132, 252, 0.25)"
  },
  {
    id: "rose-unspoken",
    name: "Rose Unspoken",
    color: "#fb7185",
    secondary: "#e11d48",
    bg: "rgba(251, 113, 133, 0.08)",
    border: "rgba(251, 113, 133, 0.35)",
    glow: "rgba(251, 113, 133, 0.25)"
  },
  {
    id: "stardust-void",
    name: "Stardust Void",
    color: "#e2e8f0",
    secondary: "#94a3b8",
    bg: "rgba(226, 232, 240, 0.06)",
    border: "rgba(226, 232, 240, 0.25)",
    glow: "rgba(226, 232, 240, 0.15)"
  }
];

export const CATEGORIES = [
  { id: "all", label: "All Echoes", icon: "Sparkles" },
  { id: "regret", label: "Regret Wall", icon: "Flame" },
  { id: "last-words", label: "Last Words Archive", icon: "Hourglass" },
  { id: "unsent", label: "Unsent Letters", icon: "Mail" },
  { id: "themed", label: "Themed Posts", icon: "Palette" }
];

export const INITIAL_ECHOES = [
  {
    id: "ECHO-10829",
    name: "To: The girl at the train station",
    category: "regret",
    message: "We shared an umbrella under the pouring rain for twenty minutes in November 2022. You smiled and said you loved winter coffee. The train arrived and I never asked for your name. Three years later, every autumn rain smells like that conversation.",
    image: "",
    likes: 84,
    liked: false,
    shares: 19,
    themeId: "amber-nostalgia",
    timestamp: Date.now() - 1000 * 60 * 60 * 3,
    comments: [
      { id: "c1", text: "I felt a tear reading this. Don't hesitate next time.", time: Date.now() - 1000 * 60 * 45 },
      { id: "c2", text: "Maybe she remembers that rainy morning too.", time: Date.now() - 1000 * 60 * 20 }
    ]
  },
  {
    id: "ECHO-20491",
    name: "To: Dad",
    category: "last-words",
    message: "You called twice on Tuesday evening asking if I was free to talk. I said I was buried in work deadlines and would call you back on the weekend. The stroke took you on Thursday morning. I still look at your contact card every Sunday waiting for the phone to ring.",
    image: "",
    likes: 142,
    liked: false,
    shares: 38,
    themeId: "midnight-sorrow",
    timestamp: Date.now() - 1000 * 60 * 60 * 18,
    comments: [
      { id: "c3", text: "He knows how deeply you loved him. Please be gentle with your heart.", time: Date.now() - 1000 * 60 * 60 * 5 },
      { id: "c4", text: "I'm calling my father right now because of this post. Thank you for the wake-up call.", time: Date.now() - 1000 * 60 * 60 * 2 }
    ]
  },
  {
    id: "ECHO-30914",
    name: "To: My childhood best friend",
    category: "unsent",
    message: "We swore we would grow old together and laugh about our teenage silly dreams. Ego and silence separated us over a stupid argument ten years ago. Today I saw you pushing a stroller in the park. You looked happy, and I hid behind a tree so I wouldn't disrupt your peace.",
    image: "",
    likes: 67,
    liked: false,
    shares: 11,
    themeId: "violet-whisper",
    timestamp: Date.now() - 1000 * 60 * 60 * 36,
    comments: [
      { id: "c5", text: "Text them. Life is too short for decade-long ego.", time: Date.now() - 1000 * 60 * 60 * 12 }
    ]
  },
  {
    id: "ECHO-40182",
    name: "To: The one who got away",
    category: "themed",
    message: "Loving you was like holding warm sand—the harder I tried to hold on, the faster it slipped through my fingers. I don't hate you for leaving; I just hate that a piece of my soul left on that flight with you.",
    image: "",
    likes: 119,
    liked: false,
    shares: 27,
    themeId: "crimson-regret",
    timestamp: Date.now() - 1000 * 60 * 60 * 60,
    comments: [
      { id: "c6", text: "Poetic and heartbreaking.", time: Date.now() - 1000 * 60 * 60 * 24 }
    ]
  },
  {
    id: "ECHO-50619",
    name: "To: My younger self at 16",
    category: "unsent",
    message: "Stop crying in the bathroom mirror. The kids in high school won't matter in five years. You are not broken, you are just growing in harsh soil. You will find people who cherish your weird laughter.",
    image: "",
    likes: 203,
    liked: false,
    shares: 54,
    themeId: "emerald-peace",
    timestamp: Date.now() - 1000 * 60 * 60 * 80,
    comments: [
      { id: "c7", text: "I needed to hear this today. Thank you so much.", time: Date.now() - 1000 * 60 * 60 * 40 }
    ]
  },
  {
    id: "ECHO-60721",
    name: "To: Maya",
    category: "regret",
    message: "I let fear dictate my silence. When you told me you were moving across the country, I just said 'congratulations'. I should have held your hand and told you I wanted you to stay.",
    image: "",
    likes: 95,
    liked: false,
    shares: 16,
    themeId: "rose-unspoken",
    timestamp: Date.now() - 1000 * 60 * 60 * 110,
    comments: []
  }
];
