export type Line = {
  /** seconds from chapter start */
  at: number;
  text: string;
  /** render emphasized (italic serif, larger) */
  em?: boolean;
};

export type World = {
  /** sky gradient stops */
  sky: [string, string];
  /** floodlight position (percent) and color */
  lightX: number;
  lightY: number;
  lightColor: string;
  lightSize: number; // percent
  fog: number; // 0..1
};

export type Ambience = {
  /** noise filter cutoff (Hz) — texture of the air */
  noiseHz: number;
  noiseGain: number; // 0..1
  /** low drone — the score placeholder */
  droneHz: number;
  droneGain: number; // 0..1
  label: string;
};

export type Chapter = {
  id: string;
  year: string;
  reel: string;
  title: string;
  duration: number; // seconds
  lines: Line[];
  world: World;
  ambience: Ambience;
};

export const STORY_TITLE = "One More Year";
export const STORY_SUBJECT = "Danny Moreau, №9";
export const STORY_LOGLINE =
  "A story found in fourteen fragments — a flat ball, a torn knee, and a man who could not stop.";

export const chapters: Chapter[] = [
  {
    id: "yard",
    year: "1998",
    reel: "Reel 01",
    title: "The Yard",
    duration: 21,
    world: {
      sky: ["#2b1f14", "#0b0a09"],
      lightX: 78,
      lightY: 18,
      lightColor: "rgba(224, 164, 60, 0.34)",
      lightSize: 62,
      fog: 0.12,
    },
    ambience: {
      noiseHz: 1400,
      noiseGain: 0.05,
      droneHz: 98,
      droneGain: 0.02,
      label: "summer air · a ball against a wall",
    },
    lines: [
      { at: 0.8, text: "The first ball was flat." },
      { at: 4.6, text: "It didn't matter." },
      {
        at: 8.4,
        text: "Between two dustbins and a chalk line, the whole world was ninety minutes long.",
      },
      { at: 15.4, text: "His mother called him in at dark. He came in at darker.", em: true },
    ],
  },
  {
    id: "fiveam",
    year: "2016",
    reel: "Reel 02",
    title: "5 A.M.",
    duration: 20,
    world: {
      sky: ["#101720", "#07080a"],
      lightX: 22,
      lightY: 10,
      lightColor: "rgba(150, 180, 214, 0.22)",
      lightSize: 55,
      fog: 0.3,
    },
    ambience: {
      noiseHz: 700,
      noiseGain: 0.09,
      droneHz: 82,
      droneGain: 0.03,
      label: "rain on an empty pitch",
    },
    lines: [
      { at: 0.8, text: "No one watches the five a.m. sessions." },
      { at: 5.0, text: "That was the point." },
      {
        at: 8.6,
        text: "Rain on an empty pitch sounds like applause, if you want it badly enough.",
      },
      { at: 15.6, text: "He wanted it badly enough.", em: true },
    ],
  },
  {
    id: "sound",
    year: "2021",
    reel: "Reel 03",
    title: "The Sound",
    duration: 19,
    world: {
      sky: ["#1a0e0e", "#060505"],
      lightX: 50,
      lightY: 30,
      lightColor: "rgba(214, 92, 60, 0.2)",
      lightSize: 44,
      fog: 0.42,
    },
    ambience: {
      noiseHz: 240,
      noiseGain: 0.06,
      droneHz: 55,
      droneGain: 0.05,
      label: "a stadium, holding its breath",
    },
    lines: [
      { at: 0.8, text: "Sixty-first minute. A turn he'd made ten thousand times." },
      { at: 6.6, text: "The knee made a sound he still hears in quiet rooms.", em: true },
      { at: 12.8, text: "The stadium went silent. Then it went on without him." },
    ],
  },
  {
    id: "quiet",
    year: "2022",
    reel: "Reel 04",
    title: "The Quiet Year",
    duration: 24,
    world: {
      sky: ["#0e0e10", "#050506"],
      lightX: 12,
      lightY: 60,
      lightColor: "rgba(180, 176, 168, 0.1)",
      lightSize: 38,
      fog: 0.55,
    },
    ambience: {
      noiseHz: 160,
      noiseGain: 0.035,
      droneHz: 49,
      droneGain: 0.04,
      label: "a hallway · fluorescent hum",
    },
    lines: [
      { at: 0.8, text: "Recovery is not a montage." },
      {
        at: 4.8,
        text: "It is a hallway, and the hallway is long, and nobody claps in a hallway.",
      },
      { at: 11.6, text: "He learned to walk twice in one life." },
      {
        at: 17.0,
        text: "Some nights he asked the ceiling if it was over. The ceiling never answered.",
        em: true,
      },
    ],
  },
  {
    id: "back",
    year: "2024",
    reel: "Reel 05",
    title: "Back",
    duration: 19,
    world: {
      sky: ["#1c2416", "#090a08"],
      lightX: 60,
      lightY: 8,
      lightColor: "rgba(213, 224, 160, 0.26)",
      lightSize: 70,
      fog: 0.2,
    },
    ambience: {
      noiseHz: 950,
      noiseGain: 0.11,
      droneHz: 110,
      droneGain: 0.035,
      label: "sixty thousand people, standing",
    },
    lines: [
      { at: 0.8, text: "The first touch back wasn't a goal." },
      { at: 5.0, text: "It was a pass. Six yards. Simple." },
      {
        at: 9.6,
        text: "But sixty thousand people stood up, because they knew what it had cost.",
        em: true,
      },
    ],
  },
  {
    id: "onemore",
    year: "2026",
    reel: "Reel 06",
    title: "One More Year",
    duration: 27,
    world: {
      sky: ["#241a10", "#0b0a09"],
      lightX: 50,
      lightY: 14,
      lightColor: "rgba(224, 164, 60, 0.4)",
      lightSize: 78,
      fog: 0.16,
    },
    ambience: {
      noiseHz: 420,
      noiseGain: 0.05,
      droneHz: 65,
      droneGain: 0.06,
      label: "dusk · the grass smell before kickoff",
    },
    lines: [
      { at: 0.8, text: "They asked him in June if it was time." },
      { at: 5.2, text: "He looked at his boots for a long moment." },
      { at: 9.6, text: "Everything hurt. Everything always hurt." },
      { at: 14.2, text: "“One more year,” he said.", em: true },
      { at: 18.6, text: "Not because he had something left to prove." },
      { at: 22.4, text: "Because he had something left to love.", em: true },
    ],
  },
];

export const totalDuration = chapters.reduce((s, c) => s + c.duration, 0);

export const chapterStart = (index: number) =>
  chapters.slice(0, index).reduce((s, c) => s + c.duration, 0);

/** fragments "Danny" shared — used in the creation preview */
export const sampleFragments = [
  { kind: "voice note", text: "my dad never came to a single match. i scored anyway.", meta: "0:41" },
  { kind: "photo", text: "a flat ball on concrete, two dustbins for posts", meta: "1998" },
  { kind: "text", text: "the physio said 9 months. it took 19.", meta: "" },
  {
    kind: "voice note",
    text: "i can't explain it. the grass smell before kickoff. that's it. that's the whole reason.",
    meta: "1:12",
  },
];

/** what the AI Director "does" during generation */
export const directorSteps = [
  "Reading fourteen fragments…",
  "Finding the moment you almost quit…",
  "Deciding where the silence goes…",
  "Choosing a voice like rain on a tin roof…",
  "Scoring the quiet year in a minor key…",
  "Cutting the ending. Keeping the hope.",
];
