/**
 * Firestore database operations
 * CRUD utilities for all collections
 */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
} from 'firebase/firestore';
import { getFirestoreInstance } from './firebase-client';
import {
  Startup,
  InvestmentOpportunity,
  InvestmentInterest,
  ProofroundPacket,
  AdminLog,
} from './models';

function mapDocsWithId<T extends { id: string }>(docs: Array<{ id: string; data: () => unknown }>): T[] {
  return docs.map(snapshot => ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<T, 'id'>),
  }));
}

// ============ STARTUPS ============

export async function createStartup(startup: Omit<Startup, 'id' | 'createdAt' | 'updatedAt'>): Promise<Startup> {
  const db = getFirestoreInstance();
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, 'startups'), {
    ...startup,
    createdAt: now,
    updatedAt: now,
    views: 0,
    saved_by: [],
  });

  return {
    ...startup,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getStartup(startupId: string): Promise<Startup | null> {
  const db = getFirestoreInstance();
  const docSnap = await getDoc(doc(db, 'startups', startupId));
  return docSnap.exists() ? ({ id: docSnap.id, ...(docSnap.data() as Omit<Startup, 'id'>) }) : null;
}

export async function updateStartup(startupId: string, updates: Partial<Startup>): Promise<void> {
  const db = getFirestoreInstance();
  await updateDoc(doc(db, 'startups', startupId), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteStartup(startupId: string): Promise<void> {
  const db = getFirestoreInstance();
  await deleteDoc(doc(db, 'startups', startupId));
}

export async function getStartupsByFounder(founderId: string): Promise<Startup[]> {
  const db = getFirestoreInstance();
  const q = query(collection(db, 'startups'), where('founderId', '==', founderId));
  const querySnapshot = await getDocs(q);
  return mapDocsWithId<Startup>(querySnapshot.docs);
}

export async function getPublicStartups(pageSize: number = 20, pageToken?: string): Promise<{ startups: Startup[]; nextPageToken?: string }> {
  const db = getFirestoreInstance();
  let q = query(
    collection(db, 'startups'),
    where('visible', '==', true),
    where('status', '!=', 'archived'),
    orderBy('status'),
    orderBy('createdAt', 'desc'),
    limit(pageSize + 1)
  );

  if (pageToken) {
    q = query(
      collection(db, 'startups'),
      where('visible', '==', true),
      where('status', '!=', 'archived'),
      orderBy('status'),
      orderBy('createdAt', 'desc'),
      startAfter(pageToken),
      limit(pageSize + 1)
    );
  }

  const querySnapshot = await getDocs(q);
  const startups = mapDocsWithId<Startup>(querySnapshot.docs.slice(0, pageSize));
  const nextPageToken = querySnapshot.docs.length > pageSize ? querySnapshot.docs[pageSize].id : undefined;

  return { startups, nextPageToken };
}

export async function searchStartups(searchTerm: string): Promise<Startup[]> {
  const db = getFirestoreInstance();
  const q = query(
    collection(db, 'startups'),
    where('visible', '==', true),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  const lowerSearchTerm = searchTerm.toLowerCase();

  return mapDocsWithId<Startup>(querySnapshot.docs)
    .filter(
      startup =>
        startup.name.toLowerCase().includes(lowerSearchTerm) ||
        startup.description.toLowerCase().includes(lowerSearchTerm) ||
        startup.industry.toLowerCase().includes(lowerSearchTerm)
    );
}

// ============ INVESTMENT OPPORTUNITIES ============

export async function createInvestmentOpportunity(
  opportunity: Omit<InvestmentOpportunity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<InvestmentOpportunity> {
  const db = getFirestoreInstance();
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, 'investment_opportunities'), {
    ...opportunity,
    createdAt: now,
    updatedAt: now,
    interested_count: 0,
    views: 0,
  });

  return {
    ...opportunity,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getInvestmentOpportunity(opportunityId: string): Promise<InvestmentOpportunity | null> {
  const db = getFirestoreInstance();
  const docSnap = await getDoc(doc(db, 'investment_opportunities', opportunityId));
  return docSnap.exists() ? ({ id: docSnap.id, ...(docSnap.data() as Omit<InvestmentOpportunity, 'id'>) }) : null;
}

export async function updateInvestmentOpportunity(
  opportunityId: string,
  updates: Partial<InvestmentOpportunity>
): Promise<void> {
  const db = getFirestoreInstance();
  await updateDoc(doc(db, 'investment_opportunities', opportunityId), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteInvestmentOpportunity(opportunityId: string): Promise<void> {
  const db = getFirestoreInstance();
  await deleteDoc(doc(db, 'investment_opportunities', opportunityId));
}

export async function getOpportunitiesByStartup(startupId: string): Promise<InvestmentOpportunity[]> {
  const db = getFirestoreInstance();
  const q = query(collection(db, 'investment_opportunities'), where('startupId', '==', startupId));
  const querySnapshot = await getDocs(q);
  return mapDocsWithId<InvestmentOpportunity>(querySnapshot.docs);
}

export async function getActiveOpportunities(): Promise<InvestmentOpportunity[]> {
  const db = getFirestoreInstance();
  const q = query(
    collection(db, 'investment_opportunities'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return mapDocsWithId<InvestmentOpportunity>(querySnapshot.docs);
}

// ============ INVESTMENT INTERESTS ============

export async function createInvestmentInterest(
  interest: Omit<InvestmentInterest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<InvestmentInterest> {
  const db = getFirestoreInstance();
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, 'investment_interests'), {
    ...interest,
    createdAt: now,
    updatedAt: now,
  });

  return {
    ...interest,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getInvestmentInterest(interestId: string): Promise<InvestmentInterest | null> {
  const db = getFirestoreInstance();
  const docSnap = await getDoc(doc(db, 'investment_interests', interestId));
  return docSnap.exists() ? ({ id: docSnap.id, ...(docSnap.data() as Omit<InvestmentInterest, 'id'>) }) : null;
}

export async function getInterestsOnOpportunity(opportunityId: string): Promise<InvestmentInterest[]> {
  const db = getFirestoreInstance();
  const q = query(collection(db, 'investment_interests'), where('opportunityId', '==', opportunityId));
  const querySnapshot = await getDocs(q);
  return mapDocsWithId<InvestmentInterest>(querySnapshot.docs);
}

export async function getInvestorInterests(investorId: string): Promise<InvestmentInterest[]> {
  const db = getFirestoreInstance();
  const q = query(collection(db, 'investment_interests'), where('investorId', '==', investorId));
  const querySnapshot = await getDocs(q);
  return mapDocsWithId<InvestmentInterest>(querySnapshot.docs);
}

export async function updateInvestmentInterest(
  interestId: string,
  updates: Partial<InvestmentInterest>
): Promise<void> {
  const db = getFirestoreInstance();
  await updateDoc(doc(db, 'investment_interests', interestId), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

// ============ PROOFROUND PACKETS ============

export async function createProofroundPacket(
  packet: Omit<ProofroundPacket, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ProofroundPacket> {
  const db = getFirestoreInstance();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year

  const docRef = await addDoc(collection(db, 'proofround_packets'), {
    ...packet,
    createdAt: now,
    updatedAt: now,
    expiresAt,
    views: 0,
  });

  return {
    ...packet,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
    expiresAt,
  };
}

export async function getProofroundPacket(packetId: string): Promise<ProofroundPacket | null> {
  const db = getFirestoreInstance();
  const docSnap = await getDoc(doc(db, 'proofround_packets', packetId));
  return docSnap.exists() ? ({ id: docSnap.id, ...(docSnap.data() as Omit<ProofroundPacket, 'id'>) }) : null;
}

export async function getPacketsByStartup(startupId: string): Promise<ProofroundPacket[]> {
  const db = getFirestoreInstance();
  const q = query(
    collection(db, 'proofround_packets'),
    where('startupId', '==', startupId),
    where('verified', '==', true)
  );
  const querySnapshot = await getDocs(q);
  return mapDocsWithId<ProofroundPacket>(querySnapshot.docs);
}

export async function updateProofroundPacket(
  packetId: string,
  updates: Partial<ProofroundPacket>
): Promise<void> {
  const db = getFirestoreInstance();
  await updateDoc(doc(db, 'proofround_packets', packetId), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

// ============ ADMIN LOGS ============

export async function logAdminAction(
  adminId: string,
  action: string,
  targetId: string,
  targetType: 'startup' | 'investment' | 'packet' | 'user',
  details?: Record<string, unknown>
): Promise<void> {
  const db = getFirestoreInstance();

  const logEntry: Omit<AdminLog, 'id'> = {
    adminId,
    action,
    targetId,
    targetType,
    details,
    createdAt: new Date().toISOString(),
  };

  await addDoc(collection(db, 'admin_logs'), logEntry);
}
