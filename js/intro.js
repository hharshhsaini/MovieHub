/* ========================================
   MOVIEHUB INTRO ANIMATION WITH AUDIO
   Orange/Black Premium Theme
======================================== */

const INTRO_CONFIG = {
    duration: 4000,
    fadeOutDelay: 200,
    appRevealDelay: 400,
    audioFadeOutDuration: 500
};

(function initIntro() {
    'use strict';
    
    const enterScreen = document.getElementById('enter-screen');
    const introOverlay = document.getElementById('intro-overlay');
    const moviehubApp = document.getElementById('moviehub-app');
    const skipButton = document.getElementById('skipIntro');
    const introAudio = document.getElementById('introAudio');
    
    let introTimeout = null;
    let hasEnded = false;
    let introStarted = false;
    
    // ========================================
    // AUDIO FUNCTIONS
    // ========================================
    function playIntroAudio() {
        if (!introAudio) return;
        
        try {
            introAudio.volume = 0.7;
            introAudio.currentTime = 0;
            introAudio.play().then(() => {
                console.log('Audio playing successfully');
            }).catch(err => {
                console.log('Audio play failed:', err);
            });
        } catch (error) {
            console.log('Audio error:', error);
        }
    }
    
    function fadeOutAudio() {
        if (!introAudio || introAudio.paused) return;
        
        const fadeInterval = 50;
        const fadeSteps = INTRO_CONFIG.audioFadeOutDuration / fadeInterval;
        const volumeStep = introAudio.volume / fadeSteps;
        
        const fadeOut = setInterval(() => {
            if (introAudio.volume > volumeStep) {
                introAudio.volume -= volumeStep;
            } else {
                introAudio.volume = 0;
                introAudio.pause();
                clearInterval(fadeOut);
            }
        }, fadeInterval);
    }
    
    function stopAudio() {
        if (!introAudio) return;
        fadeOutAudio();
    }
    
    // ========================================
    // START INTRO (after enter screen click)
    // ========================================
    function startIntro() {
        if (introStarted) return;
        introStarted = true;
        
        // Hide enter screen
        enterScreen.classList.add('hidden');
        
        // Show and play intro
        introOverlay.classList.remove('paused');
        introOverlay.classList.add('playing');
        
        // Play audio immediately (user has interacted)
        playIntroAudio();
        
        // Auto-end intro after duration
        introTimeout = setTimeout(() => {
            endIntro();
        }, INTRO_CONFIG.duration);
    }
    
    // ========================================
    // END INTRO & SHOW MAIN APP
    // ========================================
    function endIntro() {
        if (hasEnded) return;
        hasEnded = true;
        
        if (introTimeout) {
            clearTimeout(introTimeout);
            introTimeout = null;
        }
        
        stopAudio();
        introOverlay.classList.add('fade-out');
        
        setTimeout(() => {
            moviehubApp.classList.add('visible');
        }, INTRO_CONFIG.appRevealDelay);
        
        setTimeout(() => {
            introOverlay.classList.add('hidden');
        }, 1200);
    }
    
    // ========================================
    // SKIP INTRO HANDLER
    // ========================================
    function handleSkip(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        endIntro();
    }
    
    // ========================================
    // INITIALIZE
    // ========================================
    function init() {
        // Click on enter screen to start
        if (enterScreen) {
            enterScreen.addEventListener('click', startIntro);
            enterScreen.addEventListener('touchstart', startIntro);
            enterScreen.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    startIntro();
                }
            });
        }
        
        // Set up skip button
        if (skipButton) {
            skipButton.addEventListener('click', (e) => {
                e.stopPropagation();
                handleSkip(e);
            });
        }
        
        // Allow pressing Escape to skip
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && introStarted && !hasEnded) {
                handleSkip(e);
            }
        });
    }
    
    // ========================================
    // START ON DOM READY
    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
