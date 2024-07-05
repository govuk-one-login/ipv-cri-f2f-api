/* eslint-disable no-undef */
document.addEventListener('DOMContentLoaded', () => {
    const addresseeName = "Fred Flintstone";
    const addressLines = [
        "123 Fake Street",
        "Room 101",
        "Southwark",
        "London",
        "Greater London",
        "UK",
        "SE99 4QA"
    ];
    const code = "000_000_000000_000000_00000_00000_00000";

    document.getElementById('addresseeName').textContent = addresseeName;
    for (let i = 1; i <= 6; i++) {
        const addressLineElement = document.getElementById(`addressLine${i}`);
        if (addressLines[i - 1]) {
            addressLineElement.textContent = addressLines[i - 1];
        } else {
            addressLineElement.textContent = '';
        }
    }
    document.getElementById('postcode').textContent = addressLines[6];
    document.getElementById('code').textContent = code;
});