const supabaseUrl = 'https://dspglmqqumfowqhbetmo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzcGdsbXFxdW1mb3dxaGJldG1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MTQyNTksImV4cCI6MjA5NTA5MDI1OX0.SL7cIWsiKrMddcfesRmgOB_s8mYEkE6xPeirB6jB6V4';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentStep = 1;
const totalSteps = 9;

// Advanced Tracking Variables
let startTime = Date.now();
let userGeo = { ip: null, city: null, country: null };
let utmParams = { source: null, medium: null, campaign: null };
let documentReferrer = document.referrer;

// Parse UTMs
const urlParams = new URLSearchParams(window.location.search);
utmParams.source = urlParams.get('utm_source');
utmParams.medium = urlParams.get('utm_medium');
utmParams.campaign = urlParams.get('utm_campaign');

// Fetch Geo Data
fetch('https://ipapi.co/json/')
    .then(res => res.json())
    .then(data => {
        userGeo.ip = data.ip;
        userGeo.city = data.city;
        userGeo.country = data.country_name;
    })
    .catch(err => console.log("Failed to fetch geo data", err));

// Haptic Feedback Helper
function triggerHaptic(pattern = 15) {
    if (navigator.vibrate) {
        try { navigator.vibrate(pattern); } catch(e) {}
    }
}

// Gyroscope Parallax Helper
let gyroEnabled = false;
function initGyro() {
    if (gyroEnabled) return;
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(state => {
            if (state === 'granted') {
                gyroEnabled = true;
                window.addEventListener('deviceorientation', handleOrientation);
            }
        }).catch(console.error);
    } else {
        gyroEnabled = true;
        window.addEventListener('deviceorientation', handleOrientation);
    }
}

function handleOrientation(event) {
    let x = event.gamma || 0; 
    let y = event.beta || 0;  
    if (x > 90) x = 90; if (x < -90) x = -90;
    if (y > 90) y = 90; if (y < -90) y = -90;

    const xOffset = (x / 90) * 40; 
    const yOffset = (y / 90) * 40;
    
    document.documentElement.style.setProperty('--gx', `${xOffset}px`);
    document.documentElement.style.setProperty('--gy', `${yOffset}px`);
    document.documentElement.style.setProperty('--gx-inv', `${-xOffset}px`);
    document.documentElement.style.setProperty('--gy-inv', `${-yOffset}px`);
}

document.addEventListener('click', () => {
    initGyro();
}, { once: true });

// Anti-Bot Detection Flags
let isBot = false;
let userInteracted = false;

// Lead Intel Variables
const stepTiming = {};
let lastStepTime = Date.now();
let totalCharsTyped = 0;
let firstTypeTime = null;
let isSubmitted = false;

// 1. Interaction & Typing Tracking
document.addEventListener('mousemove', () => { userInteracted = true; }, { once: true });
document.addEventListener('touchstart', () => { userInteracted = true; }, { once: true });
document.addEventListener('keydown', () => { userInteracted = true; }, { once: true });

document.addEventListener('input', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (!firstTypeTime) firstTypeTime = Date.now();
        totalCharsTyped++;
    }
});

// Ghost Lead Catcher
window.addEventListener('beforeunload', () => {
    if (!isSubmitted && currentStep > 2 && !isBot) {
        const phone = document.getElementById('phone').value;
        if (phone) {
            supabaseClient.from('leads').insert([{
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: phone,
                status: 'Abandoned',
                intel: { last_step_reached: currentStep, abandoned: true }
            }]).then(() => {});
        }
    }
});

// 2. Headless Browser Detection
if (navigator.webdriver) isBot = true;
if (window.callPhantom || window._phantom || window.__nightmare) isBot = true;
if (navigator.languages && navigator.languages.length === 0) isBot = true;

const formData = {
    services: [],
    building: null,
    goal: null,
    budget: null,
    timeline: null
};

const progressTexts = [
    "Getting to know you...",
    "Cooking the strategy...",
    "This is where things get serious 👀",
    "Almost there chief...",
    "Final touches...",
    "Making it official...",
    "Just a second...",
    "The vision is clear 🚀",
    "Ready to send!"
];

function updateProgress() {
    const progress = (currentStep / totalSteps) * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;
    
    const textIndex = Math.min(Math.floor((currentStep - 1)), progressTexts.length - 1);
    document.getElementById('progressText').innerText = progressTexts[textIndex];
}

function nextStep() {
    triggerHaptic(10);
    // Record Hesitation Time for outgoing step
    const timeSpent = Math.floor((Date.now() - lastStepTime) / 1000);
    stepTiming[`step_${currentStep}`] = timeSpent;
    lastStepTime = Date.now();

    const currentElem = document.getElementById(`step-${currentStep}`);
    currentElem.classList.add('exit');
    
    setTimeout(() => {
        currentElem.classList.remove('active', 'exit');
        currentStep++;
        const nextElem = document.getElementById(`step-${currentStep}`);
        if (nextElem) {
            nextElem.classList.add('active');
            updateProgress();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Auto-focus first input if exists
            const firstInput = nextElem.querySelector('input');
            if (firstInput) firstInput.focus();
        }
    }, 500);
}

// Special handling for Step 2 (Conversational inputs)
function handleStep2() {
    const name = document.getElementById('name').value;
    const emailGroup = document.getElementById('email-group');
    const phoneGroup = document.getElementById('phone-group');
    const nextBtn = document.getElementById('step-2-next');

    if (!name) return alert("Tell us your name first!");

    if (emailGroup.style.display === 'none') {
        emailGroup.style.display = 'block';
        emailGroup.classList.add('animate-in');
        document.getElementById('email').focus();
        return;
    }

    const email = document.getElementById('email').value;
    if (!email) return alert("We need an email to send the good stuff!");

    if (phoneGroup.style.display === 'none') {
        phoneGroup.style.display = 'block';
        phoneGroup.classList.add('animate-in');
        document.getElementById('phone').focus();
        nextBtn.innerText = "Let's Continue →";
        return;
    }

    const phone = document.getElementById('phone').value;
    if (!phone) return alert("Drop your number, we promise no spam!");

    nextStep();
}

function selectOption(category, value, element) {
    triggerHaptic(15);
    formData[category] = value;
    
    // UI Update
    const siblingCards = element.parentElement.querySelectorAll('.option-card');
    siblingCards.forEach(card => card.classList.remove('selected'));
    element.classList.add('selected');
    
    // Auto-advance for simple MCQs after a small delay
    if (category !== 'building') { // Keep building step manual for city/country input
        setTimeout(nextStep, 400);
    }
}

function toggleMultiOption(category, value, element) {
    triggerHaptic(15);
    const index = formData[category].indexOf(value);
    if (index > -1) {
        formData[category].splice(index, 1);
        element.classList.remove('selected');
    } else {
        formData[category].push(value);
        element.classList.add('selected');
    }
}

async function submitForm() {
    const submitBtn = document.querySelector('#step-9 .btn');
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = "SENDING... 🚀";
    
    // Calculate time spent
    const timeOnPageSeconds = Math.floor((Date.now() - startTime) / 1000);

    // 3. Timing Check (Bot if less than 10 seconds)
    if (timeOnPageSeconds < 10) isBot = true;

    // 4. Honeypot Check
    const honeypot = document.getElementById('website_url_secondary')?.value;
    if (honeypot) isBot = true;

    // 5. Interaction Check
    if (!userInteracted) isBot = true;

    // IF BOT: Block submission and prevent success screen (avoids fake ad conversions)
    if (isBot) {
        console.warn("Bot activity detected. Blocking submission.");
        triggerHaptic([50, 100, 50]);
        alert("Oops! Something went wrong processing your request. Please try again later.");
        submitBtn.innerText = originalBtnText;
        return;
    }

    isSubmitted = true;
    stepTiming[`step_${currentStep}`] = Math.floor((Date.now() - lastStepTime) / 1000);

    // Calculate Enthusiasm Score
    let enthusiasmScore = 50;
    if (firstTypeTime && totalCharsTyped > 10) {
        const typingDuration = (Date.now() - firstTypeTime) / 1000;
        const charsPerSec = totalCharsTyped / typingDuration;
        if (charsPerSec > 5) enthusiasmScore += 20;
        else if (charsPerSec < 2) enthusiasmScore -= 10;
    }
    const visionLength = document.getElementById('vision')?.value?.length || 0;
    if (visionLength > 80) enthusiasmScore += 20;
    else if (visionLength < 20) enthusiasmScore -= 10;
    if (timeOnPageSeconds < 45) enthusiasmScore += 10;
    else if (timeOnPageSeconds > 180) enthusiasmScore -= 15;
    enthusiasmScore = Math.min(Math.max(enthusiasmScore, 0), 100);

    const intelPayload = {
        hesitation_by_step: stepTiming,
        enthusiasm_score: enthusiasmScore,
        total_chars_typed: totalCharsTyped
    };

    // Collect all data
    const finalData = {
        ...formData,
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        brand: document.getElementById('brand').value,
        location: document.getElementById('location').value,
        vision: document.getElementById('vision').value,
        socials: {
            ig: document.getElementById('social-ig').value,
            web: document.getElementById('social-web').value,
            li: document.getElementById('social-li').value
        }
    };

    try {
        const { data, error } = await supabaseClient
            .from('leads')
            .insert([
                {
                    name: finalData.name,
                    email: finalData.email,
                    phone: finalData.phone,
                    brand: finalData.brand,
                    location: finalData.location,
                    services: finalData.services,
                    building: finalData.building,
                    goal: finalData.goal,
                    budget: finalData.budget,
                    timeline: finalData.timeline,
                    vision: finalData.vision,
                    socials: finalData.socials,
                    referrer: documentReferrer,
                    utm_source: utmParams.source,
                    utm_medium: utmParams.medium,
                    utm_campaign: utmParams.campaign,
                    time_on_page_seconds: timeOnPageSeconds,
                    ip_address: userGeo.ip,
                    geo_city: userGeo.city,
                    geo_country: userGeo.country,
                    status: 'Completed',
                    intel: intelPayload
                }
            ]);

        if (error) throw error;
        
        console.log("Successfully submitted to Supabase");
        triggerHaptic([30, 50, 30, 50, 50]);
        
        // Transition to success
        const currentElem = document.getElementById(`step-9`);
        currentElem.classList.add('exit');
        
        setTimeout(() => {
            currentElem.classList.remove('active', 'exit');
            document.getElementById('step-success').classList.add('active');
            document.getElementById('progressBar').style.width = '100%';
            document.getElementById('progressText').innerText = "DONE! 😎";
        }, 500);

    } catch (err) {
        console.error("Error submitting to Supabase:", err);
        triggerHaptic([50, 100, 50]);
        if (err.code === '23505') {
            alert("It looks like you've already submitted a request with this phone number. We'll be in touch soon!");
        } else {
            alert("Oops! Something went wrong saving your details. Please try again.");
        }
        submitBtn.innerText = originalBtnText;
    }
}

// Enter key support
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        if (currentStep === 2) {
            handleStep2();
        } else if (currentStep === 1 || currentStep === 3 || currentStep === 8) {
            nextStep();
        } else if (currentStep === 9) {
            submitForm();
        }
    }
});

// Card Stack Logic
function rotateStack() {
    const stack = document.querySelector('.card-stack');
    if (stack) {
        const firstCard = stack.firstElementChild;
        stack.appendChild(firstCard);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const stack = document.querySelector('.card-stack');
    if (stack) {
        let startX = 0;
        stack.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        });

        stack.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            if (Math.abs(startX - endX) > 50) {
                rotateStack();
            }
        });
    }
});

// Auto-expand textarea
document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('vision');
    if (textarea) {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
});
