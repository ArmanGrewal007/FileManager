document.addEventListener('DOMContentLoaded', function () {
    const errorDiv = document.querySelector('.error');
    const errorText = "<%= error %>";

    if (errorText.trim() !== "") {
        errorDiv.textContent = errorText;
        errorDiv.style.display = "block";
    }
});
// JavaScript code to show info message dynamically
document.addEventListener('DOMContentLoaded', function () {
    const infoDiv = document.querySelector('.info');
    const infoText = "<%= info %>";

    if (infoText.trim() !== "") {
        infoDiv.textContent = infoText;
        infoDiv.style.display = "block";
    }
});