document.addEventListener("DOMContentLoaded", () => {
    const queueNumberElement = document.getElementById("queue-number");
    const waitTimeElement = document.getElementById("wait-time");

    if (queueNumberElement && waitTimeElement) {
        function updateQueueStatus() {
            const people = Math.floor(Math.random() * 50) + 5;
            const wait = Math.floor(people * (Math.random() * 3 + 1));

            queueNumberElement.textContent = people;
            waitTimeElement.textContent = wait;
        }

        updateQueueStatus();
        setInterval(updateQueueStatus, 15000);
    }
});