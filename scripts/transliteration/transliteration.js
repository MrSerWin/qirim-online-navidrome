/**
 * @file
 * Lightweight UI script for the transliteration module.
 *
 * This script provides the modern single-textarea UI requested by the user.
 * It deliberately does not change any backend logic — it just calls the
 * existing API endpoint at /api/transliteration with the appropriate
 * direction parameter and writes the transliterated text back into the
 * same textarea.
 */

(function (Drupal, drupalSettings) {
  'use strict';

  Drupal.behaviors.transliteration = {
    attach: function (context) {
      // Only initialize once per wrapper.
      const wrapper = context.querySelector('#transliteration-form-wrapper');
      if (!wrapper || wrapper.__transliterationInitialized) {
        return;
      }
      wrapper.__transliterationInitialized = true;

      const textarea = wrapper.querySelector('#transliteration-textarea');
      const buttons = wrapper.querySelectorAll('.transliteration-buttons .transliteration-btn');
      const clearBtn = wrapper.querySelector('#transliteration-clear');
      const copyBtn = wrapper.querySelector('#transliteration-copy');
      const sourceCount = wrapper.querySelector('.source-count');

      // Character count update
      function updateCounts() {
        if (!sourceCount || !textarea) return;
        const text = textarea.value || '';
        const chars = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        sourceCount.innerHTML = `<small>Characters: ${chars} | Words: ${words}</small>`;
      }

      textarea.addEventListener('input', updateCounts);
      updateCounts();

      // Click handlers for direction buttons
      buttons.forEach(function (btn) {
        const direction = btn.getAttribute('data-direction') || 'auto';
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          const text = textarea.value || '';

          // If empty, do nothing
          if (!text.trim()) {
            textarea.focus();
            return;
          }

          // Call the existing API endpoint. Keep same permissions/route.
          fetch('/api/transliteration', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ text: text, direction: direction })
          }).then(function (res) {
            return res.json();
          }).then(function (data) {
            if (data && data.success) {
              // Put result back into the same textarea as requested.
              textarea.value = data.transliterated_text || data.transliterated || '';
              updateCounts();
            } else if (data && data.error) {
              // Keep current text and log error — we don't change logic.
              console.error('Transliteration API error:', data.error);
            }
          }).catch(function (err) {
            console.error('Transliteration request failed:', err);
          });
        });
      });

      // Clear button
      if (clearBtn) {
        clearBtn.addEventListener('click', function (e) {
          e.preventDefault();
          textarea.value = '';
          updateCounts();
          textarea.focus();
        });
      }

      // Copy button
      if (copyBtn) {
        copyBtn.addEventListener('click', function (e) {
          e.preventDefault();
          const textToCopy = textarea.value || '';
          if (!textToCopy.trim()) return;

          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy).then(function () {
              copyBtn.classList.add('copied');
              setTimeout(function () { copyBtn.classList.remove('copied'); }, 1000);
            }).catch(function () {
              fallbackCopy(textarea, copyBtn);
            });
          } else {
            fallbackCopy(textarea, copyBtn);
          }
        });
      }

      function fallbackCopy(textareaEl, btn) {
        try {
          textareaEl.select();
          textareaEl.setSelectionRange(0, 99999);
          document.execCommand('copy');
          btn.classList.add('copied');
          setTimeout(function () { btn.classList.remove('copied'); }, 1000);
        } catch (e) {
          console.error('Copy fallback failed', e);
        }
      }

      // Keyboard shortcuts: Ctrl/Cmd+Enter -> auto, Ctrl/Cmd+Shift+C -> copy, Ctrl/Cmd+Shift+L -> clear
      wrapper.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          // Use auto detection
          const autoBtn = wrapper.querySelector('[data-direction="cyr2lat"]');
          if (autoBtn) autoBtn.click();
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
          e.preventDefault();
          if (copyBtn) copyBtn.click();
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
          e.preventDefault();
          if (clearBtn) clearBtn.click();
        }
      });
    }
  };

})(Drupal, drupalSettings);
