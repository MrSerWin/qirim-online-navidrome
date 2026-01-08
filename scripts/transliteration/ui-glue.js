/**
 * @file
 * UI glue for transliteration module.
 *
 * Synchronizes the visible textarea with the hidden editSrc textarea
 * that the base transliterator.js expects.
 */
(function (Drupal) {
  'use strict';

  Drupal.behaviors.transliterationUiGlue = {
    attach: function (context) {
      var wrapper = context.querySelector('#transliteration-form-wrapper');
      if (!wrapper || wrapper.__uiGlueInit) return;
      wrapper.__uiGlueInit = true;

      var visible = wrapper.querySelector('#transliteration-textarea');
      var hidden = wrapper.querySelector('#editSrc');
      var buttons = wrapper.querySelectorAll('.transliteration-buttons .transliteration-btn');
      var clearBtn = wrapper.querySelector('#transliteration-clear');
      var copyBtn = wrapper.querySelector('#transliteration-copy');

      function updateCounts() {
        var sourceCount = wrapper.querySelector('.source-count');
        if (!sourceCount) return;
        var text = visible.value || '';
        var chars = text.length;
        var words = text.trim() ? text.trim().split(/\s+/).length : 0;
        sourceCount.innerHTML = '<small>Characters: ' + chars + ' | Words: ' + words + '</small>';
      }

      visible.addEventListener('input', updateCounts);
      updateCounts();

      // Map buttons to base functions. The base transliterator expects element with id editSrc.
      buttons.forEach(function (btn) {
        var direction = btn.getAttribute('data-direction');
        // Skip non-direction buttons (clear, copy)
        if (!direction) return;

        btn.addEventListener('click', function (e) {
          e.preventDefault();
          // sync visible -> hidden
          hidden.value = visible.value;

          if (direction === 'cyr2lat') {
            // call base transliterate with cyr2lat rules
            transliterate(cyr2lat);
          } else if (direction === 'lat2cyr') {
            transliterate(lat2cyr);
          }

          // sync hidden -> visible
          visible.value = hidden.value;
          updateCounts();
        });
      });

      if (clearBtn) {
        clearBtn.addEventListener('click', function (e) {
          e.preventDefault();
          visible.value = '';
          hidden.value = '';
          updateCounts();
          visible.focus();
        });
      }

      if (copyBtn) {
        copyBtn.addEventListener('click', function (e) {
          e.preventDefault();
          var textToCopy = visible.value || '';
          if (!textToCopy.trim()) return;
          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy).then(function() {
              copyBtn.classList.add('copied');
              setTimeout(function () { copyBtn.classList.remove('copied'); }, 800);
            }).catch(function(err) {
              console.error('Copy failed', err);
              fallbackCopy();
            });
          } else {
            fallbackCopy();
          }

          function fallbackCopy() {
            try {
              visible.select();
              document.execCommand('copy');
              copyBtn.classList.add('copied');
              setTimeout(function () { copyBtn.classList.remove('copied'); }, 800);
            } catch (err) {
              console.error('Copy failed', err);
            }
          }
        });
      }

      // keyboard shortcuts
      wrapper.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          // default to cyr2lat
          var btn = wrapper.querySelector('[data-direction="cyr2lat"]');
          if (btn) btn.click();
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
})(Drupal);
