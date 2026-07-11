export type Line = {
  /** seconds from chapter start */
  at: number;
  text: string;
  /** render emphasized */
  em?: boolean;
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
  edition: string;
  /** the back-page headline for this chapter */
  headline: string;
  duration: number; // seconds
  lines: Line[];
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
    edition: "Edition No. 1",
    headline: "The Yard",
    duration: 21,
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
    edition: "Edition No. 2",
    headline: "5 A.M.",
    duration: 20,
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
    edition: "Edition No. 3",
    headline: "Moreau Out",
    duration: 19,
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
    edition: "Edition No. 4",
    headline: "The Quiet Year",
    duration: 24,
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
    edition: "Edition No. 5",
    headline: "He's Back",
    duration: 19,
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
    edition: "Final Edition",
    headline: "One More Year",
    duration: 27,
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

/** fragments "Danny" shared — used in the scrapbook */
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

/** what the editor does to the wire copy, in order */
export const editorSteps = [
  "reading fourteen fragments…",
  "finding the moment you almost quit…",
  "cutting what a stranger would write…",
  "keeping what only you would say…",
  "deciding where the silence goes…",
  "sending it to the voice desk.",
];

export const tickerItems = [
  "MOREAU SAYS YES TO ONE MORE YEAR",
  "FLAT BALL, BIG DREAMS — A YARD STORY",
  "19 MONTHS: THE COMEBACK NOBODY PRINTED",
  "SIXTY THOUSAND ON THEIR FEET FOR A SIX-YARD PASS",
  "WHAT'S THE THING YOU CAN'T QUIT?",
];
