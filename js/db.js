import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    getDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const moviesCollection = collection(db, 'movies');

export const getMovies = async () => {
    const snapshot = await getDocs(moviesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getMovieById = async (id) => {
    const docRef = doc(db, 'movies', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        return null;
    }
};

export const addMovie = async (movieData) => {
    return await addDoc(moviesCollection, movieData);
};

export const updateMovie = async (id, movieData) => {
    const docRef = doc(db, 'movies', id);
    return await updateDoc(docRef, movieData);
};

export const deleteMovie = async (id) => {
    const docRef = doc(db, 'movies', id);
    return await deleteDoc(docRef);
};