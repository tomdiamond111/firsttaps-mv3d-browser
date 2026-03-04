/**
 * SMS 3D Sound Manager
 * Handles sound effects for 3D message balloons
 */

(function() {
    'use strict';

    /**
     * Sound Manager for 3D SMS
     */
    class Sms3DSoundManager {
        constructor() {
            this.sounds = {};
            this.enabled = true;
            this.volume = 0.5;
            this.currentPack = 'standard';
            
            this.loadSoundPack('standard');
            
            console.log('🔊 SMS 3D Sound Manager initialized');
        }

        /**
         * Load a sound pack
         */
        loadSoundPack(packName) {
            this.currentPack = packName;
            
            if (packName === 'none') {
                this.enabled = false;
                return;
            }
            
            this.enabled = true;
            
            // Sound file paths (these would be actual audio files in production)
            const soundPacks = {
                standard: {
                    send: null, // We'll use Audio API with generated tones
                    receive: null,
                    expand: null
                },
                retro: {
                    send: null, // Retro 8-bit style tones
                    receive: null,
                    expand: null
                },
                futuristic: {
                    send: null, // Sci-fi style tones
                    receive: null,
                    expand: null
                }
            };

            // For now, we'll use Web Audio API to generate simple tones
            // In production, replace with actual audio file loading
            this.sounds = soundPacks[packName] || soundPacks.standard;
            
            console.log(`🔊 Loaded sound pack: ${packName}`);
        }

        /**
         * Play a sound effect using Web Audio API
         */
        playSound(type) {
            if (!this.enabled || this.currentPack === 'none') {
                return;
            }

            try {
                // Create simple tone using Web Audio API
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                let frequency, duration, waveType;
                
                switch (type) {
                    case 'send':
                        frequency = this.getSendFrequency();
                        duration = 0.1;
                        waveType = this.getSendWaveType();
                        break;
                    case 'receive':
                        frequency = this.getReceiveFrequency();
                        duration = 0.15;
                        waveType = this.getReceiveWaveType();
                        break;
                    case 'expand':
                        frequency = 800;
                        duration = 0.05;
                        waveType = 'sine';
                        break;
                    default:
                        return;
                }

                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.type = waveType;
                oscillator.frequency.value = frequency;
                
                gainNode.gain.value = this.volume;
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.start();
                oscillator.stop(audioContext.currentTime + duration);

            } catch (error) {
                console.warn('🔊 Sound playback error:', error);
            }
        }

        /**
         * Get send frequency based on sound pack
         */
        getSendFrequency() {
            switch (this.currentPack) {
                case 'retro': return 880; // A5 - higher pitch
                case 'futuristic': return 1200; // Higher sci-fi tone
                default: return 660; // E5 - standard
            }
        }

        /**
         * Get receive frequency based on sound pack
         */
        getReceiveFrequency() {
            switch (this.currentPack) {
                case 'retro': return 440; // A4 - classic
                case 'futuristic': return 900; // Sci-fi
                default: return 550; // Standard notification tone
            }
        }

        /**
         * Get send wave type based on sound pack
         */
        getSendWaveType() {
            switch (this.currentPack) {
                case 'retro': return 'square'; // 8-bit style
                case 'futuristic': return 'sawtooth'; // Sci-fi
                default: return 'sine'; // Smooth
            }
        }

        /**
         * Get receive wave type based on sound pack
         */
        getReceiveWaveType() {
            switch (this.currentPack) {
                case 'retro': return 'square';
                case 'futuristic': return 'sawtooth';
                default: return 'sine';
            }
        }

        /**
         * Set volume (0.0 to 1.0)
         */
        setVolume(volume) {
            this.volume = Math.max(0, Math.min(1, volume));
            console.log(`🔊 Volume set to: ${this.volume}`);
        }

        /**
         * Mute/unmute
         */
        setEnabled(enabled) {
            this.enabled = enabled;
            console.log(`🔊 Sounds ${enabled ? 'enabled' : 'disabled'}`);
        }

        /**
         * Change sound pack
         */
        changeSoundPack(packName) {
            this.loadSoundPack(packName);
        }
    }

    // Export globally
    window.Sms3DSoundManager = Sms3DSoundManager;

    console.log('🔊 SMS 3D Sound Manager module loaded');

})();
