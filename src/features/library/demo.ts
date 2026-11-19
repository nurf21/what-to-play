import type { Game } from "./games";

export const demoGames: Game[] = [
  { id: "demo-elden", title: "Elden Ring", platform: "Steam", externalId: "1245620", genres: ["RPG", "Open World"], status: "Playing", playtime: 2520, coverUrl: "/art/elden-ring.jpg", storeUrl: "https://store.steampowered.com/app/1245620/", excluded: false, addedAt: 4 },
  { id: "demo-hades", title: "Hades", platform: "Epic Games", genres: ["Roguelike", "Action"], status: "Completed", playtime: 1560, coverUrl: "/art/hades.jpg", storeUrl: "https://store.epicgames.com/p/hades", excluded: false, addedAt: 3 },
  { id: "demo-cyberpunk", title: "Cyberpunk 2077", platform: "Epic Games", genres: ["RPG", "Open World"], status: "Not Played", coverUrl: "/art/cyberpunk.jpg", storeUrl: "https://store.epicgames.com/p/cyberpunk-2077", excluded: false, addedAt: 2 },
  { id: "demo-hollow", title: "Hollow Knight", platform: "Steam", externalId: "367520", genres: ["Metroidvania", "Action"], status: "Not Played", coverUrl: "/art/hollow-knight.jpg", storeUrl: "https://store.steampowered.com/app/367520/", excluded: false, addedAt: 1 },
];
