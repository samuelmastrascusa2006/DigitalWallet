import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  DocumentReference,
  CollectionReference,
  getDoc,
  setDoc
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DataConnector {

  private store = inject(Firestore);

  /**
   * Data Source Reference
   */
  getFolder(path: string): CollectionReference {
    return collection(this.store, path);
  }

  getEntry(path: string): DocumentReference {
    return doc(this.store, path);
  }

  /**
   * Streaming Data
   */
  streamFolder<T>(path: string): Observable<T[]> {
    const ref = collection(this.store, path);
    return collectionData(ref, { idField: 'id' }) as Observable<T[]>;
  }

  streamEntry<T>(path: string): Observable<T> {
    const ref = doc(this.store, path);
    return docData(ref, { idField: 'id' }) as Observable<T>;
  }

  /**
   * Snapshot Extraction
   */
  async getSnapshot<T>(path: string): Promise<T | null> {
    const ref = doc(this.store, path);
    const snap = await getDoc(ref);
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null;
  }

  /**
   * Asset Mutations
   */
  async commitFolder(path: string, payload: any): Promise<DocumentReference> {
    const ref = collection(this.store, path);
    const customDoc = doc(ref); // Generates ID client-side
    await setDoc(customDoc, payload);
    return customDoc;
  }

  async commitEntry(path: string, payload: any): Promise<void> {
    const ref = doc(this.store, path);
    return updateDoc(ref, payload);
  }

  async purgeEntry(path: string): Promise<void> {
    const ref = doc(this.store, path);
    return deleteDoc(ref);
  }

  /**
   * Advanced Query Extraction
   */
  queryFolder<T>(
    path: string,
    field: string,
    op: any,
    val: any,
    sortField?: string,
    max?: number
  ): Observable<T[]> {
    const ref = collection(this.store, path);
    let q = query(ref, where(field, op, val));

    if (sortField) {
      q = query(q, orderBy(sortField, 'desc'));
    }

    if (max) {
      q = query(q, limit(max));
    }

    return collectionData(q, { idField: 'id' }) as Observable<T[]>;
  }
}
