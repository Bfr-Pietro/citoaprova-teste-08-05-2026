import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  increment,
  where
} from 'firebase/firestore'
import { db } from './config'

// Types
export interface GameProgressData {
  currentPhase: number
  currentMinigame: number
  completedPhases: number[]
  phaseScores: Record<number, number>
  totalScore: number
  lives: number
  unlockedBlocks: number[]
  streak: number
  lastPlayedDate: string | null
  updatedAt?: Timestamp
}

// Game Config - salvo no Firebase ao inves de localStorage
export interface GameConfigData {
  mode: 'historia' | 'pratica'
  difficulty: 'facil' | 'normal' | 'dificil'
  playerName: string
  firstVisitComplete: boolean
  updatedAt?: Timestamp
}

export interface UserProfileData {
  uid: string
  email: string | null
  displayName: string
  photoURL: string | null
  bio?: string
  username?: string
  createdAt: Timestamp
  lastLoginAt: Timestamp
  provider: 'email' | 'google'
  totalScore: number
  completedPhases: number[]
  currentPhase: number
  streak: number
  _r?: string // Hidden admin marker
}

export interface RankingEntry {
  uid: string
  displayName: string
  photoURL: string | null
  totalScore: number
  completedPhases: number
  streak: number
  position?: number
}

// User Progress Functions
export const getUserProgress = async (uid: string): Promise<GameProgressData | null> => {
  try {
    const progressRef = doc(db, 'users', uid, 'gameData', 'progress')
    const progressSnap = await getDoc(progressRef)

    if (progressSnap.exists()) {
      return progressSnap.data() as GameProgressData
    }
    return null
  } catch (error) {
    console.error('Error getting user progress:', error)
    return null
  }
}

export const saveUserProgress = async (uid: string, progress: GameProgressData): Promise<boolean> => {
  try {
    const progressRef = doc(db, 'users', uid, 'gameData', 'progress')
    await setDoc(progressRef, {
      ...progress,
      updatedAt: serverTimestamp()
    }, { merge: true })

    // Also update the main user document with summary data
    const userRef = doc(db, 'users', uid)
    await updateDoc(userRef, {
      totalScore: progress.totalScore,
      completedPhases: progress.completedPhases,
      currentPhase: progress.currentPhase,
      streak: progress.streak
    })

    return true
  } catch (error) {
    console.error('Error saving user progress:', error)
    return false
  }
}

// Game Config Functions - substituem localStorage
export const getGameConfig = async (uid: string): Promise<GameConfigData | null> => {
  try {
    const configRef = doc(db, 'users', uid, 'gameData', 'config')
    const configSnap = await getDoc(configRef)

    if (configSnap.exists()) {
      return configSnap.data() as GameConfigData
    }
    return null
  } catch (error) {
    console.error('Error getting game config:', error)
    return null
  }
}

export const saveGameConfig = async (uid: string, config: Omit<GameConfigData, 'updatedAt'>): Promise<boolean> => {
  try {
    const configRef = doc(db, 'users', uid, 'gameData', 'config')
    await setDoc(configRef, {
      ...config,
      updatedAt: serverTimestamp()
    }, { merge: true })
    return true
  } catch (error) {
    console.error('Error saving game config:', error)
    return false
  }
}

// Profile Functions
export const getUserProfile = async (uid: string): Promise<UserProfileData | null> => {
  try {
    const userRef = doc(db, 'users', uid)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      return userSnap.data() as UserProfileData
    }
    return null
  } catch (error) {
    console.error('Error getting user profile:', error)
    return null
  }
}

// Get public profile data for viewing other users
export interface PublicProfileData {
  uid: string
  displayName: string
  photoURL: string | null
  bio?: string
  totalScore: number
  completedPhases: number[]
  streak: number
  createdAt?: Date
}

export const getPublicProfile = async (uid: string): Promise<PublicProfileData | null> => {
  try {
    const userRef = doc(db, 'users', uid)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      const data = userSnap.data()
      return {
        uid: data.uid || uid,
        displayName: data.displayName || 'Jogador',
        photoURL: data.photoURL || null,
        bio: data.bio,
        totalScore: data.totalScore || 0,
        completedPhases: data.completedPhases || [],
        streak: data.streak || 0,
        createdAt: data.createdAt?.toDate?.() || undefined
      }
    }
    return null
  } catch (error) {
    console.error('Error getting public profile:', error)
    return null
  }
}

export const updateUserProfile = async (
  uid: string,
  updates: Partial<Pick<UserProfileData, 'displayName' | 'bio' | 'photoURL'>>
): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', uid)
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
    return true
  } catch (error) {
    console.error('Error updating user profile:', error)
    return false
  }
}

// Ranking Functions
export const getGlobalRanking = async (limitCount: number = 50): Promise<RankingEntry[]> => {
  try {
    const usersRef = collection(db, 'users')
    const rankingQuery = query(
      usersRef,
      orderBy('totalScore', 'desc'),
      limit(limitCount)
    )

    const querySnapshot = await getDocs(rankingQuery)
    const ranking: RankingEntry[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      ranking.push({
        uid: doc.id,
        displayName: data.displayName || 'Anonimo',
        photoURL: data.photoURL || null,
        totalScore: data.totalScore || 0,
        completedPhases: data.completedPhases?.length || 0,
        streak: data.streak || 0,
        position: ranking.length + 1
      })
    })

    return ranking
  } catch (error) {
    console.error('Error getting global ranking:', error)
    return []
  }
}

export const getUserRankingPosition = async (uid: string): Promise<number | null> => {
  try {
    const userProfile = await getUserProfile(uid)
    if (!userProfile) return null

    const usersRef = collection(db, 'users')
    const higherScoreQuery = query(
      usersRef,
      where('totalScore', '>', userProfile.totalScore)
    )

    const querySnapshot = await getDocs(higherScoreQuery)
    return querySnapshot.size + 1
  } catch (error) {
    console.error('Error getting user ranking position:', error)
    return null
  }
}

// Streak Functions
export const updateStreak = async (uid: string, newStreak: number, lastPlayedDate: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', uid)
    await updateDoc(userRef, {
      streak: newStreak,
      lastPlayedDate
    })
    return true
  } catch (error) {
    console.error('Error updating streak:', error)
    return false
  }
}

// Score Functions
export const addScore = async (uid: string, scoreToAdd: number): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', uid)
    await updateDoc(userRef, {
      totalScore: increment(scoreToAdd)
    })
    return true
  } catch (error) {
    console.error('Error adding score:', error)
    return false
  }
}

// Check if user is admin by email
export const checkIsAdmin = async (uid: string, email?: string | null): Promise<boolean> => {
  try {
    console.log('checkIsAdmin chamado com:', { uid, email })

    // Check by email in admin_emails collection
    if (email) {
      const docId = email.toLowerCase().replace(/[@.]/g, '_')
      console.log('Procurando documento com ID:', docId)

      const adminEmailRef = doc(db, 'admin_emails', docId)
      const adminSnap = await getDoc(adminEmailRef)
      console.log('Documento existe?', adminSnap.exists())

      if (adminSnap.exists()) {
        return true
      }
    }
    
    // Also check _r field in user profile (legacy)
    const userProfile = await getUserProfile(uid)
    console.log('Campo _r do perfil:', userProfile?._r)
    return userProfile?._r === 'a'
  } catch (error) {
    console.error('Erro em checkIsAdmin:', error)
    return false
  }
}

// Character Data Types and Functions
export type CharacterEmotion = 'neutral' | 'happy' | 'angry' | 'surprised' | 'thinking' | 'worried' | 'evil' | 'determined'

export interface CharacterData {
  id: 'detetive' | 'drCell' | 'fragmentado'
  name: string
  description: string
  images: Partial<Record<CharacterEmotion, string>>
  updatedAt?: Timestamp
}

export const DEFAULT_CHARACTERS: CharacterData[] = [
  {
    id: 'detetive',
    name: 'Detetive',
    description: 'O protagonista que busca conhecimento',
    images: {}
  },
  {
    id: 'drCell',
    name: 'Dr. Cell',
    description: 'Mentor que ensina citologia',
    images: {}
  },
  {
    id: 'fragmentado',
    name: 'Fragmentado',
    description: 'Vilao que desafia e provoca o jogador',
    images: {}
  }
]

// Get all characters
export const getCharacters = async (): Promise<CharacterData[]> => {
  try {
    const charactersRef = collection(db, 'characters')
    const querySnapshot = await getDocs(charactersRef)
    
    if (querySnapshot.empty) {
      // Return defaults if no characters in DB
      return DEFAULT_CHARACTERS
    }
    
    const characters: CharacterData[] = []
    querySnapshot.forEach((doc) => {
      characters.push({ id: doc.id, ...doc.data() } as CharacterData)
    })
    
    // Merge with defaults to ensure all characters exist
    return DEFAULT_CHARACTERS.map(defaultChar => {
      const dbChar = characters.find(c => c.id === defaultChar.id)
      return dbChar || defaultChar
    })
  } catch (error) {
    console.error('Error getting characters:', error)
    return DEFAULT_CHARACTERS
  }
}

// Get single character
export const getCharacter = async (characterId: string): Promise<CharacterData | null> => {
  try {
    const charRef = doc(db, 'characters', characterId)
    const charSnap = await getDoc(charRef)
    
    if (charSnap.exists()) {
      return { id: charSnap.id, ...charSnap.data() } as CharacterData
    }
    
    // Return default if not in DB
    return DEFAULT_CHARACTERS.find(c => c.id === characterId) || null
  } catch (error) {
    console.error('Error getting character:', error)
    return DEFAULT_CHARACTERS.find(c => c.id === characterId) || null
  }
}

// Save character (admin only)
export const saveCharacter = async (
  adminUid: string, 
  adminEmail: string | null,
  character: CharacterData
): Promise<boolean> => {
  const isAdmin = await checkIsAdmin(adminUid, adminEmail)
  if (!isAdmin) {
    console.error('User is not admin')
    return false
  }
  
  try {
    const charRef = doc(db, 'characters', character.id)
    await setDoc(charRef, {
      ...character,
      updatedAt: serverTimestamp()
    }, { merge: true })
    return true
  } catch (error) {
    console.error('Error saving character:', error)
    return false
  }
}

// Update character image for specific emotion
export const updateCharacterImage = async (
  adminUid: string,
  adminEmail: string | null,
  characterId: string,
  emotion: CharacterEmotion,
  imageUrl: string
): Promise<boolean> => {
  const isAdmin = await checkIsAdmin(adminUid, adminEmail)
  if (!isAdmin) {
    console.error('User is not admin')
    return false
  }
  
  try {
    const charRef = doc(db, 'characters', characterId)
    await setDoc(charRef, {
      [`images.${emotion}`]: imageUrl,
      updatedAt: serverTimestamp()
    }, { merge: true })
    return true
  } catch (error) {
    console.error('Error updating character image:', error)
    return false
  }
}

// Admin Functions (only work for admin users)
export const getAllUsers = async (adminUid: string): Promise<UserProfileData[]> => {
  const isAdmin = await checkIsAdmin(adminUid)
  if (!isAdmin) return []

  try {
    const usersRef = collection(db, 'users')
    const usersQuery = query(usersRef, orderBy('createdAt', 'desc'), limit(100))
    const querySnapshot = await getDocs(usersQuery)

    const users: UserProfileData[] = []
    querySnapshot.forEach((doc) => {
      users.push({ uid: doc.id, ...doc.data() } as UserProfileData)
    })

    return users
  } catch (error) {
    console.error('Error getting all users:', error)
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULADO FINAL
// ─────────────────────────────────────────────────────────────────────────────

export interface SimuladoQuestion {
  id: string
  enunciado: string
  alternativas: [string, string, string, string]
  respostaCorreta: 0 | 1 | 2 | 3
  explicacao: string
  /** Imagem opcional armazenada como data URL (base64) diretamente no Firestore. Máx ~500KB. */
  imagemBase64: string
  ordem: number
  updatedAt?: Timestamp
}

// Busca todas as questões do simulado final, ordenadas por 'ordem'
export const getSimuladoQuestions = async (): Promise<SimuladoQuestion[]> => {
  try {
    const colRef = collection(db, 'simuladoFinal')
    const q = query(colRef, orderBy('ordem', 'asc'))
    const snap = await getDocs(q)
    const questions: SimuladoQuestion[] = []
    snap.forEach((docSnap) => {
      questions.push({ id: docSnap.id, ...docSnap.data() } as SimuladoQuestion)
    })
    return questions
  } catch (error) {
    console.error('Erro ao buscar questões do simulado:', error)
    return []
  }
}

// Busca uma única questão
export const getSimuladoQuestion = async (questionId: string): Promise<SimuladoQuestion | null> => {
  try {
    const docRef = doc(db, 'simuladoFinal', questionId)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SimuladoQuestion
    }
    return null
  } catch (error) {
    console.error('Erro ao buscar questão do simulado:', error)
    return null
  }
}

// Salva (cria ou atualiza) uma questão — admin only
export const saveSimuladoQuestion = async (
  adminUid: string,
  adminEmail: string | null,
  question: SimuladoQuestion
): Promise<boolean> => {
  const isAdm = await checkIsAdmin(adminUid, adminEmail)
  if (!isAdm) {
    console.error('Usuário não é admin')
    return false
  }

  try {
    const { id, ...data } = question
    const payload = {
      ...data,
      updatedAt: serverTimestamp()
    }

    if (id && !id.startsWith('new_')) {
      // Atualização de questão existente
      const docRef = doc(db, 'simuladoFinal', id)
      await setDoc(docRef, payload, { merge: true })
    } else {
      // Nova questão — ID gerado pelo Firestore
      const colRef = collection(db, 'simuladoFinal')
      await addDoc(colRef, payload)
    }

    return true
  } catch (error) {
    console.error('Erro ao salvar questão do simulado:', error)
    return false
  }
}

// Exclui uma questão — admin only
export const deleteSimuladoQuestion = async (
  adminUid: string,
  adminEmail: string | null,
  questionId: string
): Promise<boolean> => {
  const isAdm = await checkIsAdmin(adminUid, adminEmail)
  if (!isAdm) {
    console.error('Usuário não é admin')
    return false
  }

  try {
    const docRef = doc(db, 'simuladoFinal', questionId)
    await deleteDoc(docRef)
    return true
  } catch (error) {
    console.error('Erro ao excluir questão do simulado:', error)
    return false
  }
}
