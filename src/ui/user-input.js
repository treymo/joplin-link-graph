const container = document.getElementById("user-input-container");

function chromeRangeInputFix() {
  // workaround for chrome concerning range inputs,
  // not allowing slider to be dragged.
  // See https://stackoverflow.com/q/69490604
  // todo: is there a better solution?
  document.querySelectorAll('input[type="range"]').forEach((input) => {
    input.addEventListener("mousedown", () =>
      window.getSelection().removeAllRanges()
    );
  });
}

function initDistanceRangeInput(initialValue, handleChange) {
  const html = `
  <label for="maxDistance">Max. distance</label>
  <input 
    name="maxDistance"
    type="range"
    min="0"
    value="${initialValue}"
    max="5"
    step="1"
  >
  <output>${initialValue}</output>
  `;
  container.insertAdjacentHTML("beforeend", html);
  const input = container.querySelector("input[name='maxDistance']")
  input.addEventListener("input", function () {
    const output = this.nextElementSibling;
    output.value = this.value;
  });
  input.addEventListener("change", function () {
    handleChange(this.valueAsNumber);
  });
}

export function init(initDistanceValue, handleDistanceChange, handleRedraw) {
  chromeRangeInputFix();
  initDistanceRangeInput(initDistanceValue, handleDistanceChange);
  document
    .getElementById("redrawButton")
    .addEventListener("click", handleRedraw);
}
