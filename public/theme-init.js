(function () {
  try {
    var dark = localStorage.getItem("theme") === "dark";
    var root = document.documentElement;
    if (dark) root.classList.add("dark");
    root.style.colorScheme = dark ? "dark" : "light";
    root.style.backgroundColor = dark ? "#3a2d20" : "#f4d9a0";
  } catch {
    // Theme initialization is optional when browser storage is unavailable.
  }
})();