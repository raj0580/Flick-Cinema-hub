import { db } from './firebase-config.js';
import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, orderBy, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const moviesCollection = collection(db, 'movies');
const requestsCollection = collection(db, 'movie_requests');
const adsCollection = collection(db, 'ads');
const reportsCollection = collection(db, 'reports');

export const getMovies = async () => {
    const snapshot = await getDocs(moviesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const getMovieById = async (id) => {
    const docRef = doc(db, 'movies', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};
export const addMovie = async (movieData) => {
    movieData.timestamp = new Date();
    return await addDoc(moviesCollection, movieData);
};
export const updateMovie = async (id, movieData) => {
    movieData.timestamp = new Date();
    return await updateDoc(doc(db, 'movies', id), movieData);
};
export const deleteMovie = async (id) => await deleteDoc(doc(db, 'movies', id));

export const addMovieRequest = async (requestData) => await addDoc(requestsCollection, requestData);
export const getMovieRequests = async () => {
    const q = query(requestsCollection, orderBy('requestedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const deleteMovieRequest = async (id) => await deleteDoc(doc(db, 'movie_requests', id));

export const getAds = async () => {
    const snapshot = await getDocs(adsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addAd = async (adData) => await addDoc(adsCollection, adData);
export const updateAd = async (id, adData) => await updateDoc(doc(db, 'ads', id), adData);
export const deleteAd = async (id) => await deleteDoc(doc(db, 'ads', id));

export const addReport = async (reportData) => await addDoc(reportsCollection, reportData);
export const getReports = async () => {
    const q = query(reportsCollection, orderBy('reportedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const deleteReport = async (id) => await deleteDoc(doc(db, 'reports', id));
