export const ThemeScript = () => {
  const script = `
    (function() {
      try {
        var themes = ["dino", "dog", "cow", "potato", "starwars", "elephant"];
        function mulberry32(seed) {
          var a = seed;
          a = (a + 0x9e3779b9) | 0;
          var t = a ^ (a >>> 16);
          t = Math.imul(t, 0x21f0aaad);
          t = t ^ (t >>> 15);
          t = Math.imul(t, 0x735a2d97);
          a = t ^ (t >>> 15);

          return function() {
            var t = a += 0x6d2b79f5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
          };
        }
        function shuffle(array, seed) {
          var result = array.slice();
          var random = mulberry32(seed);
          for (var i = result.length - 1; i > 0; i--) {
            var j = Math.floor(random() * (i + 1));
            var temp = result[i];
            result[i] = result[j];
            result[j] = temp;
          }
          return result;
        }
        var epochMs = Date.UTC(2026, 2, 2, 5, 0, 0);
        var diffMs = Date.now() - epochMs;
        var periodIndex = Math.floor(diffMs / (12 * 60 * 60 * 1000));
        
        var theme = "elephant";
        if (periodIndex !== 0) {
          var bagSize = themes.length;
          var currentBagIndex = Math.floor(periodIndex / bagSize);
          var indexWithinBag = periodIndex % bagSize;
          var currentBag = shuffle(themes, currentBagIndex);
          if (currentBagIndex > 0) {
            var previousBag = shuffle(themes, currentBagIndex - 1);
            if (currentBag[0] === previousBag[bagSize - 1]) {
              var temp = currentBag[0];
              currentBag[0] = currentBag[1];
              currentBag[1] = temp;
            }
          }
          theme = currentBag[indexWithinBag];
        }
        
        var isDark = false;
        var storedDark = localStorage.getItem("dark-mode-override");
        if (storedDark !== null) {
          isDark = storedDark === "true";
        } else {
          isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        }
        
        var html = document.documentElement;
        // Remove any existing theme classes that might have been server-rendered
        html.className = html.className.replace(/\\btheme-[a-z]+\\b/g, '');
        if (isDark) {
          html.classList.add("dark");
        } else {
          html.classList.remove("dark");
        }

        function normalizeLocale(value) {
          if (!value) return null;
          var lowered = String(value).toLowerCase();
          if (lowered.indexOf("es") === 0) return "es";
          if (lowered.indexOf("en") === 0) return "en";
          return null;
        }
        var storedLocale = normalizeLocale(localStorage.getItem("queens-locale"));
        var systemLocales = (navigator.languages || []).concat(navigator.language);
        var browserLocale = null;
        for (var i = 0; i < systemLocales.length && !browserLocale; i++) {
          browserLocale = normalizeLocale(systemLocales[i]);
        }
        html.lang = storedLocale || browserLocale || "en";

        html.classList.add("theme-" + theme);
      } catch (e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
};
