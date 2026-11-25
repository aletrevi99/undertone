import type { Env, MTrack } from "./types";

export type RequestStatus = "asked" | "ready" | "choose" | "nothing";
export interface RequestRow {
  item_id: string;
  title: string;
  artist: string;
  album: string | null;
  image: string | null;
  status: RequestStatus;
  via: string | null;
  detail: string | null;
  created_at: number;
  updated_at: number;
}

export async function saveRequest(
  env: Env,
  userId: string,
  itemId: string,
  t: MTrack,
  status: RequestStatus,
  via?: string | null,
  detail?: string | null,
) {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO requests (user_id, item_id, title, artist, album, image, status, via, detail, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, item_id) DO UPDATE SET status = excluded.status, via = COALESCE(excluded.via, requests.via),
       detail = COALESCE(excluded.detail, requests.detail), updated_at = excluded.updated_at`,
  )
    .bind(
      userId,
      itemId,
      t.title,
      t.artistName,
      t.albumTitle || null,
      t.image || null,
      status,
      via || null,
      detail || null,
      now,
      now,
    )
    .run();
}

export async function listRequests(env: Env, userId: string): Promise<RequestRow[]> {
  const { results } = await env.DB.prepare(
    "SELECT item_id, title, artist, album, image, status, via, detail, created_at, updated_at FROM requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 300",
  )
    .bind(userId)
    .all<RequestRow>();
  return results;
}

export async function getRequest(env: Env, userId: string, itemId: string) {
  return env.DB.prepare(
    "SELECT item_id, title, artist, album, image, status, via, detail, created_at, updated_at FROM requests WHERE user_id = ? AND item_id = ?",
  )
    .bind(userId, itemId)
    .first<RequestRow>();
}

export async function removeRequest(env: Env, userId: string, itemId: string) {
  await env.DB.prepare("DELETE FROM requests WHERE user_id = ? AND item_id = ?")
    .bind(userId, itemId)
    .run();
}
