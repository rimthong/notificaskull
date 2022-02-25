require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT;

let jobIsRunning = false;

// Connectivity
const HUE_BRIDGE_API_URI = process.env.HUE_BRIDGE_API_URI;
const HUE_LIGHT_ID = process.env.HUE_LIGHT_ID;
const HUE_USER_ID = process.env.HUE_USER_ID;

// Pulsing when doing workloads
const PULSE_TIME_MS = parseInt(process.env.DEFAULT_PULSE_TIME_MS);
const TRANSITION_TIME = PULSE_TIME_MS/100; // is in 100ms, weirdly enough
const BRI_LO = parseInt(process.env.BRI_LO);
const BRI_HI = parseInt(process.env.BRI_HI);

console.log("Initiating, pulse time ms and transition time are:", PULSE_TIME_MS, TRANSITION_TIME);

// Defaults for success/failure and returning to normal
const DEFAULT_HUE = process.env.DEFAULT_HUE;
const SUCCESS_HUE = process.env.SUCCESS_HUE;
const FAILURE_HUE = process.env.FAILURE_HUE;
const DEFAULT_STATE= {
    on: process.env.DEFAULT_ON,
    hue: process.env.DEFAULT_HUE,
    bri: parseInt(process.env.DEFAULT_BRI),
    sat: parseInt(process.env.DEFAULT_SAT),
}

// Convenience, find a better way to use colours for projects later
const BLUE_HUE = 46920;

const HUE_LIGHT_URL = `${HUE_BRIDGE_API_URI}${HUE_USER_ID}/lights/${HUE_LIGHT_ID}`;

// Convenience method to make things more readable
const wait = time => {
    return new Promise(resolve => setTimeout(resolve, time))
}

async function dim(hue = DEFAULT_HUE, transitiontime = TRANSITION_TIME) {
    await axios.put(`${HUE_LIGHT_URL}/state`, {on:true, hue, bri: BRI_LO, transitiontime });
}

async function bright(hue = DEFAULT_HUE, transitiontime = TRANSITION_TIME) {
    await axios.put(`${HUE_LIGHT_URL}/state`, {on:true, hue, bri: BRI_HI, transitiontime });
}

async function pulse(hue = DEFAULT_HUE, pulseTimeMs = PULSE_TIME_MS) {
    await dim(hue, pulseTimeMs / 100);
    await wait(pulseTimeMs);
    await bright(hue, pulseTimeMs / 100);
    await wait(pulseTimeMs);
}

async function work(hue = DEFAULT_HUE, pulseTimeMs = PULSE_TIME_MS) {
    console.info("Initiating job with hue and pulse:", hue, pulseTimeMs);
    while(jobIsRunning) {
        await pulse(hue, pulseTimeMs);
    }
}

async function restoreDefault() {
    await axios.put(`${HUE_LIGHT_URL}/state`, DEFAULT_STATE);
}

async function haltJob(hue = FAILURE_HUE) {
    jobIsRunning = false;
    await wait(PULSE_TIME_MS);
    await axios.put(`${HUE_LIGHT_URL}/state`, {on:true, hue});
    setTimeout(restoreDefault, PULSE_TIME_MS);
}

app.get('/', (req, res) => {
    if(!jobIsRunning) {
        jobIsRunning = true;
        work();
    }
    res.send('OK');
});

app.post('/', (req, res) => {
    if(!jobIsRunning) {
        jobIsRunning = true;
        work();
    }
    res.send('OK');
});

app.get('/frontend', (req, res) => {
    if(!jobIsRunning) {
        jobIsRunning = true;
        work(BLUE_HUE, 500);
    }
    res.send('OK');
});

app.get('/success', (req, res) => {
    haltJob(SUCCESS_HUE);
    res.send('OK');
});

app.get('/fail', (req, res) => {
    haltJob(FAILURE_HUE);
    res.send('OK');
});

app.get('/kill', (req, res) => {
    haltJob();
    res.send('OK');
});

app.listen(port, () => {
    console.info(`Server listening on port ${port}`);
});