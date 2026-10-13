'use client';
const themeEvent='simdiacik-theme-change';
export const subscribeTheme=(notify:()=>void)=>{window.addEventListener('storage',notify);window.addEventListener(themeEvent,notify);return()=>{window.removeEventListener('storage',notify);window.removeEventListener(themeEvent,notify);};};
export const readTheme=()=>{try{return localStorage.getItem('simdiacik-theme')==='dark';}catch{return false;}};
export const serverTheme=()=>false;
export function writeTheme(dark:boolean){try{localStorage.setItem('simdiacik-theme',dark?'dark':'light');}catch{}document.documentElement.classList.toggle('dark',dark);window.dispatchEvent(new Event(themeEvent));}
export const subscribeNetwork=(notify:()=>void)=>{window.addEventListener('online',notify);window.addEventListener('offline',notify);return()=>{window.removeEventListener('online',notify);window.removeEventListener('offline',notify);};};
export const readNetwork=()=>navigator.onLine;
export const serverNetwork=()=>true;
