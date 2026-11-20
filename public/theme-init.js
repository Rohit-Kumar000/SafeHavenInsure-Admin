(function () {
  try {
    var dark = localStorage.getItem("theme") === "dark";
    var root = document.documentElement;
    if (dark) root.classList.add("dark");
    root.style.colorScheme = dark ? "dark" : "light";
    root.style.backgroundColor = dark ? "#0f172a" : "#f4f7fb";
  } catch {
    // Theme initialization is optional when browser storage is unavailable.
  }
})();