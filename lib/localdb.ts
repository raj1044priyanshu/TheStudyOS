"use client";

import { openDB } from "idb";
import type { FlashcardDeckSummary, NoteSummary, PlannerDetails } from "@/types";

const DB_NAME = "studyos-offline";
const DB_VERSION = 1;

export const getDB = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("notes")) {
        db.createObjectStore("notes", { keyPath: "_id" });
      }
      if (!db.objectStoreNames.contains("flashcards")) {
        db.createObjectStore("flashcards", { keyPath: "_id" });
      }
      if (!db.objectStoreNames.contains("studyplan")) {
        db.createObjectStore("studyplan", { keyPath: "_id" });
      }
      if (!db.objectStoreNames.contains("sync-queue")) {
        db.createObjectStore("sync-queue", { keyPath: "id", autoIncrement: true });
      }
    }
  });

async function safeRun<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function cacheNotes(notes: NoteSummary[]) {
  return safeRun(async () => {
    const db = await getDB();
    const tx = db.transaction("notes", "readwrite");
    await Promise.all(notes.map((note) => tx.store.put({ ...note, cachedAt: new Date().toISOString() })));
    await tx.done;
  }, undefined);
}

export async function getCachedNotes(): Promise<NoteSummary[]> {
  return safeRun(async () => {
    const db = await getDB();
    return db.getAll("notes");
  }, []);
}

export async function cacheFlashcards(decks: FlashcardDeckSummary[]) {
  return safeRun(async () => {
    const db = await getDB();
    const tx = db.transaction("flashcards", "readwrite");
    await Promise.all(decks.map((deck) => tx.store.put({ ...deck, cachedAt: new Date().toISOString() })));
    await tx.done;
  }, undefined);
}

export async function getCachedFlashcards(): Promise<FlashcardDeckSummary[]> {
  return safeRun(async () => {
    const db = await getDB();
    return db.getAll("flashcards");
  }, []);
}

export async function cacheStudyPlan(plan: PlannerDetails) {
  return safeRun(async () => {
    const db = await getDB();
    const tx = db.transaction("studyplan", "readwrite");
    await tx.store.put({ ...plan, cachedAt: new Date().toISOString() });
    await tx.done;
  }, undefined);
}

export async function getCachedStudyPlans(): Promise<PlannerDetails[]> {
  return safeRun(async () => {
    const db = await getDB();
    return db.getAll("studyplan");
  }, []);
}
