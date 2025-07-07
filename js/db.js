import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    getDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc,
    orderBy,
    query 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const moviesCollection = collection(db, 'movies');
const requestsCollection = collection(db, 'movie_requests');

export const getMovies = async () => {
    const snapshot = await getDocs(moviesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getMovieById = async (id) => {
    const docRef = doc(db, 'movies', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const addMovie = async (movieData) => await addDoc(moviesCollection, movieData);

export const updateMovie = async (id, movieData) => await updateDoc(doc(db, 'movies', id), movieData);

export const deleteMovie = async (id) => await deleteDoc(doc(db, 'movies', id));

// --- NEW Movie Request Functions ---
export const addMovieRequest = async (requestData) => {
    return await addDoc(requestsCollection, requestData);
};

export const getMovieRequests = async () => {
    const q = query(requestsCollection, orderBy('requestedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteMovieRequest = async (id) => {
    return await deleteDoc(doc(db, 'movie_requests', id));
};
