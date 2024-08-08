"use strict";
const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
class Workout {
    date = new Date();
    id = (Date.now() + "").slice(-10);
    constructor(coords, disatance, duration){
        this.coords = coords; // [lat, lng]
        this.disatance = disatance; // km
        this.duration = duration; // min
    }
    _setDescription() {
        // prettier-ignore
        const months = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}
class Running extends Workout {
    type = "running";
    constructor(coords, disatance, duration, cadence){
        super(coords, disatance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }
    calcPace() {
        this.pace = this.duration / this.disatance;
        return this.pace;
    }
}
class Cycling extends Workout {
    type = "cycling";
    constructor(coords, disatance, duration, elevationGain){
        super(coords, disatance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }
    calcSpeed() {
        this.speed = this.disatance / (this.duration / 60);
        return this.speed;
    }
}
// const run = new Running([22, 22], 7, 88, 180);
// const cycling = new Running([22, 22], 27, 100, 344);
// console.log(run, cycling);
class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];
    constructor(){
        this._getPosition();
        form.addEventListener("submit", this._newWorkout.bind(this));
        inputType.addEventListener("change", this._toggleElevation.bind(this));
        containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
        this._getLocalStorage();
        containerWorkouts.addEventListener("click", this._deleteWorkout.bind(this));
    }
    _getPosition() {
        if (navigator.geolocation) navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
            alert("Could not get your position");
        });
    }
    _loadMap(pos) {
        const { latitude, longitude } = pos.coords;
        const coords = [
            latitude,
            longitude
        ];
        this.#map = L.map("map").setView(coords, this.#mapZoomLevel);
        L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
        this.#map.on("click", this._showFrom.bind(this));
        this.#workouts.forEach((work)=>{
            this._renderWorkoutMarker(work);
        });
    }
    _showFrom(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove("hidden");
        inputDistance.focus();
    }
    _hideForm() {
        inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value = "";
        form.style.display = "none";
        form.classList.add("hidden");
        setTimeout(()=>form.style.display = "grid", 1000);
    }
    _toggleElevation() {
        inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
        inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    }
    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map).bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`
        })).setPopupContent(`${workout.type === "running" ? "\uD83C\uDFC3\u200D\u2642\uFE0F" : "\uD83D\uDEB4\u200D\u2640\uFE0F"} ${workout.description}`).openPopup();
    }
    _renderWorkoutList(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === "running" ? "\uD83C\uDFC3\u200D\u2642\uFE0F" : "\uD83D\uDEB4\u200D\u2640\uFE0F"}</span>
            <span class="workout__value">${workout.disatance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">\u{23F1}</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;
        if (workout.type === "running") html += `
          <div class="workout__details">
              <span class="workout__icon">\u{26A1}\u{FE0F}</span>
              <span class="workout__value">${workout.pace.toFixed(1)}</span>
              <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">\u{1F9B6}\u{1F3FC}</span>
              <span class="workout__value">${workout.cadence}</span>
              <span class="workout__unit">spm</span>
            </div>
            <button class="delete-btn" data-id="${workout.id}">Delete</button>
        </li>
      `;
        if (workout.type === "cycling") html += `
          <div class="workout__details">
            <span class="workout__icon">\u{26A1}\u{FE0F}</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">\u{26F0}</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
          <button class="delete-btn" data-id="${workout.id}">Delete</button>
        </li>
      `;
        form.insertAdjacentHTML("afterend", html);
    }
    _newWorkout(e) {
        e.preventDefault();
        // Helper functions
        const isNum = (...inputs)=>inputs.every((inp)=>Number.isFinite(inp));
        const positiveNum = (...inputs)=>inputs.every((inp)=>inp > 0);
        // Get data
        const type = inputType.value;
        const disatance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        // Creting workout
        let workout;
        if (type === "running") {
            const cadence = +inputCadence.value;
            if (!isNum(disatance, duration, cadence) || !positiveNum(disatance, duration, cadence)) return alert("Inputs must be positive numbers");
            workout = new Running([
                lat,
                lng
            ], disatance, duration, cadence);
        }
        if (type === "cycling") {
            const elevation = +inputElevation.value;
            if (!isNum(disatance, duration, elevation) || !positiveNum(disatance, duration)) return alert("Inputs must be positive numbers");
            workout = new Cycling([
                lat,
                lng
            ], disatance, duration, elevation);
        }
        // Render workout on map as marker
        this._renderWorkoutMarker(workout);
        // Render workout list
        this._renderWorkoutList(workout);
        // Clearing fields and hide form
        this._hideForm();
        // Saving workout in array
        this.#workouts.push(workout);
        // Save data in local storage
        this._setLocalStorage();
    }
    _moveToPopup(e) {
        if (e.target.classList.contains("delete-btn")) return;
        const workEl = e.target.closest(".workout");
        if (!workEl) return;
        const workout = this.#workouts.find((wo)=>wo.id === workEl.dataset.id);
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });
    }
    _setLocalStorage() {
        localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    }
    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem("workouts"));
        if (!data) return;
        this.#workouts = data;
        this.#workouts.forEach((work)=>{
            this._renderWorkoutList(work);
        });
    }
    reset() {
        localStorage.removeItem("workouts");
    }
    _deleteWorkout(e) {
        const workEl = e.target.closest(".delete-btn");
        if (!workEl) return;
        const workout = this.#workouts.find((work)=>work.id === workEl.dataset.id);
        const index = this.#workouts.indexOf(workout);
        this.#workouts.splice(index, 1);
        this._setLocalStorage();
        location.reload();
    }
}
const app = new App();

//# sourceMappingURL=index.672d4772.js.map
