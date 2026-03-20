export function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export function roomLeaderboardKey(roomCode: string) {
  return `room:${roomCode}:leaderboard`;
}

export function roomQuestionsKey(roomCode: string) {
  return `room:${roomCode}:questions`;
}
